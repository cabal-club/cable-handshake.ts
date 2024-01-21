import NoiseState from 'noise-handshake'
import CipherState from 'noise-handshake/cipher.js'

const PROLOGUE = Buffer.from('CABLE')

export class Noise {
  private noise: NoiseState
  private initiator: boolean

  constructor(initiator: boolean, key: NoiseState.KeyPair, psk: Buffer) {
    this.initiator = initiator
    // XXX: Some 'as any' uses to get around the types module for
    // 'noise-handshake' not having my PR's changes:
    // https://github.com/holepunchto/noise-handshake/pull/10/
    this.noise = new NoiseState('XXpsk0' as any, initiator, key, { psk } as any)
    this.noise.initialise(PROLOGUE)
  }

  send(): Buffer {
    return this.noise.send() as Buffer
  }

  recv(bytes: Buffer) {
    this.noise.recv(bytes)
  }

  getCipherStates(): [CipherState, CipherState] {
    if (!this.noise.tx || !this.noise.rx) {
      throw new Error('Handshake was not completed correctly')
    }
    const tx = new CipherState(this.noise.tx)
    const rx = new CipherState(this.noise.rx)
    return this.initiator ? [tx, rx] : [tx, rx]
  }
}

