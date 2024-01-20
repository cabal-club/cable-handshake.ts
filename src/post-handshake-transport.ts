import CipherState from 'noise-handshake/cipher.js'
import { AsyncStream } from './async-stream.js'

const MAX_CIPHERTEXT_MSG_LEN = 65535
const AUTH_TAG_LEN = 16
const MAX_PLAINTEXT_SEGMENT_LEN = MAX_CIPHERTEXT_MSG_LEN - AUTH_TAG_LEN

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
    // Compute & write ciphertext length
    const totalCiphertextLen =
      Math.floor(bytes.length / MAX_PLAINTEXT_SEGMENT_LEN) * MAX_CIPHERTEXT_MSG_LEN +
      (bytes.length % MAX_PLAINTEXT_SEGMENT_LEN) + AUTH_TAG_LEN
    const lenBytes = Buffer.alloc(4)
    lenBytes.writeUInt32LE(totalCiphertextLen, 0)
    this.stream.write(lenBytes)

    // Write ciphertext segments
    let written = 0
    while (written < bytes.length) {
      const segmentLen = Math.min(MAX_PLAINTEXT_SEGMENT_LEN, bytes.length - written)
      const toWrite = bytes.subarray(written, written + segmentLen)
      const ciphertext = this.tx.encrypt(toWrite) as Buffer
      this.stream.write(ciphertext)
      written += toWrite.length
    }
  }

  // Read prefix & decrypt ciphertext segments
  async read(): Promise<Buffer> {
    const lenBytes = await this.stream.read(4)
    let len = lenBytes.readUInt32LE(0)

    let plaintext = Buffer.alloc(0)
    while (len > 0) {
      let segmentLen = Math.min(MAX_CIPHERTEXT_MSG_LEN, len)
      let ciphertext = await this.stream.read(segmentLen)
      let segment = this.rx.decrypt(ciphertext)
      plaintext = Buffer.concat([plaintext, segment])
      len -= segmentLen
    }

    return plaintext
  }

  async destroy() {
    // TODO: https://github.com/cabal-club/cable/issues/17
    this.stream.destroy()
  }
}

