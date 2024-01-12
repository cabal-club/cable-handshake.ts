import { Duplex } from 'stream'

export class Throttle extends Duplex {
  private delay: number

  constructor(time: number) {
    super()
    this.delay = time
  }

  _read() {
  }

  _write(chunk: Buffer, _: BufferEncoding, callback: any) {
    this.push(chunk)
    setTimeout(callback, this.delay)
  }

  _final() {
    this.push(null);
  }
}

export class ErrorStream extends Duplex {
  constructor() {
    super()
  }

  _read() {
  }

  _write(chunk: Buffer, _: BufferEncoding, callback: any) {
    if (chunk.toString() === 'break') {
      callback(new Error('intentional error'))
      return
    }
    this.push(chunk)
    callback()
  }

  _final() {
    this.push(null);
  }
}

export function briefly() {
  return new Promise((resolve,_)=>{setTimeout(resolve, 100)})
}

