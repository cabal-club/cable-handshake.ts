import NoiseState from 'noise-handshake'
import * as dh from 'noise-handshake/dh.js'
import { Noise } from './noise.js'
import { Duplex } from 'stream'
import { AsyncStream } from '../src/async-stream.js'
import { PostHandshakeTransport } from './post-handshake-transport.js'
import debug from 'debug'

const STATIC_KEY_LEN                = 64
const EPHEMERAL_KEY_LEN             = 48
const EPHEMERAL_AND_STATIC_KEY_LEN  = 96

enum Role {
  Initiator,
  Responder
}

enum State {
  Start,
  InUse,
  Done,
  Failed
}

export class Handshake {
  private noise: Noise
  private state: State
  private stream: AsyncStream
  private readonly role: Role
  private debug: debug.Debugger

  static generateKeyPair(): dh.KeyPair {
    return dh.generateKeyPair()
  }

  constructor(key: NoiseState.KeyPair, psk: Buffer, initiator: boolean, stream: Duplex, noise: Noise|undefined = undefined) {
    this.debug = debug('cable-handshake:' + (initiator ? 'I' : 'R'))
    this.role = initiator ? Role.Initiator : Role.Responder
    this.stream = new AsyncStream(stream)
    this.noise = noise ?? new Noise(initiator, key, psk)
    this.state = State.Start
  }

  assertState(expected: State) {
    if (this.state !== expected) {
      throw new Error(`Invalid state: expected ${State[expected]} but got ${State[this.state]}`)
    }
  }

  async write(bytes: Buffer) {
    await this.stream.write(bytes)
  }

  async read(len: number): Promise<Buffer> {
    return await this.stream.read(len)
  }


  public async handshake(): Promise<PostHandshakeTransport> {
    try {
      if (this.role === Role.Initiator) {
        await this.handshakeAsInitiator()
      } else {
        await this.handshakeAsResponder()
      }
      const c = this.noise.getCipherStates()
      return new PostHandshakeTransport(this.stream, c[0], c[1])
    } catch (err) {
      this.state = State.Failed
      throw err
    }
  }

  async handshakeAsInitiator() {
    this.assertState(State.Start)
    this.state = State.InUse

    this.debug('write e. key')
    await this.writeEphemeralKey()

    this.debug('read e. + s. keys')
    await this.readEphemeralAndStaticKey()

    this.debug('write s. key')
    await this.writeStaticKey()

    this.debug('done')
    this.state = State.Done
  }

  async handshakeAsResponder() {
    this.assertState(State.Start)
    this.state = State.InUse

    this.debug('read e. key')
    await this.readEphemeralKey()

    this.debug('write e. + s. keys')
    await this.writeEphemeralAndStaticKey()

    this.debug('read s. key')
    await this.readStaticKey()

    this.debug('done')
    this.state = State.Done
  }

  async writeEphemeralKey() {
    await this.stream.write(this.noise.send())
  }

  async readEphemeralKey() {
    this.noise.recv(await this.stream.read(EPHEMERAL_KEY_LEN))
  }

  async writeEphemeralAndStaticKey() {
    await this.stream.write(this.noise.send())
  }

  async readEphemeralAndStaticKey() {
    this.noise.recv(await this.stream.read(EPHEMERAL_AND_STATIC_KEY_LEN))
  }

  async writeStaticKey() {
    await this.stream.write(this.noise.send())
  }

  async readStaticKey() {
    this.noise.recv(await this.stream.read(STATIC_KEY_LEN))
  }
}

