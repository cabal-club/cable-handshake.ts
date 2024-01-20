import NoiseState from 'noise-handshake'
import * as dh from 'noise-handshake/dh.js'
import { Noise } from './noise.js'
import { Duplex } from 'stream'
import { AsyncStream } from '../src/async-stream.js'
import { PostHandshakeTransport } from './post-handshake-transport.js'
import debug from 'debug'

const VERSION                       = Buffer.from([1,0])  // <01 00>
const PROTOCOL_VERSION_MSG_LEN      = 2
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
  private readonly version: Buffer
  private debug: debug.Debugger

  static generateKeyPair(): dh.KeyPair {
    return dh.generateKeyPair()
  }

  constructor(key: NoiseState.KeyPair, psk: Buffer, initiator: boolean, stream: Duplex, version = VERSION) {
    this.debug = debug('cable-handshake:' + (initiator ? 'I' : 'R'))
    this.role = initiator ? Role.Initiator : Role.Responder
    this.stream = new AsyncStream(stream)
    this.noise = new Noise(initiator, key, psk)
    this.version = version
    this.state = State.Start
  }

  assertState(expected: State) {
    if (this.state !== expected) {
      throw new Error(`Invalid state: expected ${State[expected]} but got ${State[this.state]}`)
    }
  }

  isVersionCompatible(versionBytes: Buffer): boolean {
    const localVersion = this.version.readUint8(0)
    const remoteVersion = versionBytes.readUint8(0)
    return localVersion == remoteVersion
  }

  write(bytes: Buffer) {
    this.stream.write(bytes)
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

    this.debug('write version')
    this.writeVersion()

    this.debug('read version')
    await this.readAndCompareVersion()

    this.debug('write e. key')
    this.writeEphemeralKey()

    this.debug('read e. + s. keys')
    await this.readEphemeralAndStaticKey()

    this.debug('write s. key')
    this.writeStaticKey()

    this.debug('done')
    this.state = State.Done
  }

  async handshakeAsResponder() {
    this.assertState(State.Start)
    this.state = State.InUse

    this.debug('read version')
    const remoteVersion = await this.read(PROTOCOL_VERSION_MSG_LEN)
    const compatible = this.isVersionCompatible(remoteVersion)

    this.debug('write version')
    this.writeVersion()
    if (!compatible) {
      const localMajor = this.version.readUInt8(0)
      const remoteMajor = remoteVersion.readUInt8(0)
      throw new Error(`Expected remote version ${localMajor} but got ${remoteMajor}`)
    }

    this.debug('read e. key')
    await this.readEphemeralKey()

    this.debug('write e. + s. keys')
    this.writeEphemeralAndStaticKey()

    this.debug('read s. key')
    await this.readStaticKey()

    this.debug('done')
    this.state = State.Done
  }

  writeVersion() {
    this.write(VERSION)
  }

  async readAndCompareVersion(): Promise<boolean> {
    const data = await this.read(PROTOCOL_VERSION_MSG_LEN)
    return this.isVersionCompatible(data)
  }

  async readVersion(): Promise<Buffer> {
    return await this.read(PROTOCOL_VERSION_MSG_LEN)
  }

  writeEphemeralKey() {
    this.stream.write(this.noise.send())
  }

  async readEphemeralKey() {
    this.noise.recv(await this.stream.read(EPHEMERAL_KEY_LEN))
  }

  writeEphemeralAndStaticKey() {
    this.stream.write(this.noise.send())
  }

  async readEphemeralAndStaticKey() {
    this.noise.recv(await this.stream.read(EPHEMERAL_AND_STATIC_KEY_LEN))
  }

  writeStaticKey() {
    this.stream.write(this.noise.send())
  }

  async readStaticKey() {
    this.noise.recv(await this.stream.read(STATIC_KEY_LEN))
  }
}

