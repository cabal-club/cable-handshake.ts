import { Duplex } from 'stream'

export class AsyncStream {
  private stream: Duplex

  constructor(stream: Duplex) {
    this.stream = stream
  }

  // Writes all of `bytes`. Undefined behaviour if called while already running.
  write(bytes: Buffer | string): Promise<void> {
    return new Promise((resolve, reject) => {
      const written = this.stream.write(bytes)
      if (written) return resolve()

      const onDrain = () => {
        this.stream.write(bytes)
        removeListeners()
        resolve()
      }
      const onError = (err: Error) => {
        removeListeners()
        reject(err)
      }

      const removeListeners = () => {
        this.stream.removeListener('drain', onDrain)
        this.stream.removeListener('error', onError)
      }
      this.stream.once('drain', onDrain)
      this.stream.once('error', onError)
    })
  }

  // Read exactly `len` bytes. Undefined behaviour if called while already running.
  read(len: number): Promise<Buffer> {
    if (this.stream.readableEnded) {
      return Promise.reject(new Error('stream has ended'))
    }
    if (this.stream.errored) {
      return Promise.reject(new Error('stream has errored'))
    }

    let bytes = Buffer.alloc(0)
    return new Promise((resolve, reject) => {
      const read = () => {
        const data = this.stream.read(len)

        // No more bytes ready yet.
        if (data === null) {
          const onReadable = () => {
            removeListeners()
            read()
          }
          const onError = (err: Error) => {
            removeListeners()
            reject(err)
          }
          const onEnd = () => {
            removeListeners()
            reject(new Error('stream has ended'))
          }
          const removeListeners = () => {
            this.stream.removeListener('readable', onReadable)
            this.stream.removeListener('end', onEnd)
            this.stream.removeListener('error', onError)
          }
          this.stream.once('readable', onReadable)
          this.stream.once('end', onEnd)
          this.stream.once('error', onError)
          return
        }

        bytes = Buffer.concat([bytes, data])
        if (bytes.length === len) return resolve(bytes)
        else if (bytes.length > len) return reject(new Error('too many bytes given by stream'))
        else read()
      }
      read()
    })
  }
}

