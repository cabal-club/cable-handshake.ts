import CipherState from 'noise-handshake/cipher'
import { AsyncStream } from './async-stream'

export class PostHandshakeTransport {
  private tx: CipherState
  private rx: CipherState
  private stream: AsyncStream

  constructor(stream: AsyncStream, tx: CipherState, rx: CipherState) {
    this.tx = tx
    this.rx = rx
    this.stream = stream
  }

  // TODO: look into the Uint8Array situation re: types here plz!

  write(bytes: Buffer) {
    // TODO: fragmentation
    const ciphertext = this.tx.encrypt(bytes) as Buffer
    const lenBytes = Buffer.alloc(4)
    lenBytes.writeUInt32LE(ciphertext.length, 0)

    this.stream.write(lenBytes)
    this.stream.write(ciphertext)
  }

  // Read prefix + encrypted bytes + decrypt
  async read(): Promise<Buffer> {
    // TODO: fragmentation
    const lenBytes = await this.stream.read(4)
    const len = lenBytes.readUInt32LE(0)
    return this.rx.decrypt(await this.stream.read(len)) as Buffer
  }

  async destroy() {
    // XXX: how to end 'stream'? 'stream.destroy()'?
    // TODO: https://github.com/cabal-club/cable/issues/17
    throw new Error('not implemented')
  }
}

