import { Duplex } from 'stream'
import mutexify from 'mutexify'

enum State {
  Ready,    // stream is readable
  Done,     // EOS has been reached
  Error     // stream in error state
}

export class AsyncStream {
  private stream: Duplex
  private state: State
  private error: Error | null

  constructor(stream: Duplex) {
    this.stream = stream
    this.state = State.Ready
    this.error = null

    const onError = (err: Error) => {
      this.state = State.Error
      this.error = err
      this.stream.removeListener('error', onError)
      this.stream.removeListener('end', onEnd)
    }
    const onEnd = () => {
      this.state = State.Done
      this.stream.removeListener('error', onError)
      this.stream.removeListener('end', onEnd)
    }

    this.stream.once('error', onError)
    this.stream.once('end', onEnd)
  }

  end() {
    this.stream.end()
  }

  write(bytes: Buffer | string) {
    this.stream.write(bytes)
  }

  read(len: number): Promise<Buffer> {
    if (this.state === State.Error) throw this.error
    if (this.state === State.Done) throw new Error('Cannot read: stream has ended.')

    let bytes = Buffer.alloc(0)
    return new Promise((resolve, reject) => {
      const lock = mutexify()
      lock(release => {
        const read = () => {
          this.stream.removeListener('readable', read)
          this.stream.removeListener('end', read)
          this.stream.removeListener('error', read)

          const data = this.stream.read(len)
          if (!data) {
            if (this.state !== State.Ready) {
              if (this.state === State.Error) reject(this.error)
              if (this.state === State.Done) reject(new Error('Cannot read: stream has ended.'))
              release()
              return
            }
            this.stream.once('readable', read)
            this.stream.once('end', read)
            this.stream.once('error', read)
            return
          }

          bytes = Buffer.concat([bytes, data])
          len -= data.length
          if (len <= 0) {
            resolve(bytes)
            release()
          } else {
            process.nextTick(read)
          }
        }
        read()
      })
    })
  }
}

