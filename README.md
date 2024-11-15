# cable-handshake.ts

Implements 1.0-draft8 of the [Cable Handshake Protocol](https://github.com/cabal-club/cable/blob/main/handshake.md).

# Install
```
npm install cable-handshake.ts
```

# API
```
import { Handshake } from 'cable-handshake.ts'
```

## `Handshake.generateKeyPair(): NoiseState.KeyPair`
Static method to generate a new public/private keypair.

## `new Handshake(key, psk, initiator, stream)`
Create a new Cable Handshake instance.

- `key` `<NoiseState.KeyPair>`: A public/private keypair for this peer.
- `psk` `<Buffer>`: A 32-byte buffer containing the pre-shared key of the Cabal to join or create.
- `initiator` `<boolean>`: `true` if this instance is initiating the handshake. One side MUST be initiator and the other MUST be responder (`false`).
- `stream` `<Duplex>`: The duplex stream that facilitates communication with the remote peer with which to handshake.

## `handshake.handshake(): Promise<PostHandshakeTransport>`
Exchanges the necessary protocol messages with the remote peer to establish a secure transport.

## `postHandshakeTransport.write(bytes: Buffer): Promise<void>`
Writes an encrypted message to the remote peer.

## `postHandshakeTransport.read(): Promise<Buffer>`
Reads an encrypted message from the remote peer.

If the empty buffer is returned, it means the other side has requested to end the session. Proper etiquette is to call `postHandshakeTransport.writeEos()` and not perform any further writes.

## `postHandshakeTransport.writeEos(): Promise<void>`
Writes the protocol's end-of-stream marker (an empty payload).

Proper etiquette is to wait to receive the remote peer's end-of-stream marker, by calling `postHandshakeTransport.readEos()`. There is no guarantee it will arrive.

## `postHandshakeTransport.readEos(): Promise<void>`
Reads from the stream, expecting the next message to be an end-of-stream marker. If something else is instead received, the promise rejects. There is no guarantee the other side will end an end-of-stream marker.


# Example
```js
import { Handshake } from '../src/handshake.js'
import net from 'net'

const PSK = Buffer.alloc(32).fill(0x08)

async function client() {
  const key = Handshake.generateKeyPair()
  console.log('Client is', key.publicKey.toString('hex'))

  const socket = net.connect({ host: 'localhost', port: 7500 })

  const hs = new Handshake(key, PSK, true, socket)
  const tx = await hs.handshake()

  await tx.write(Buffer.from('Hello Cable world!'))

  await tx.readEos()
  await tx.writeEos()
  console.log('Client closed gracefully')

  socket.once('close', () => {
    console.log('Client socket closed')
  })
}

async function server() {
  const key = Handshake.generateKeyPair()
  console.log('Server is', key.publicKey.toString('hex'))

  const server = net.createServer(async socket => {
    const hs = new Handshake(key, PSK, false, socket)
    const tx = await hs.handshake()

    socket.once('close', () => {
      console.log('Server socket closed')
      server.close()
    })

    const msg = await tx.read()
    console.log('Server recv\'d:', msg.toString())

    await tx.writeEos()
    await tx.readEos()
    console.log('Server closed gracefully')
    socket.end()
  })

  server.listen(7500, undefined, undefined, () => console.log('Listening on 0.0.0.0:7500'))
}

server()
client()
```
outputs
```
Server is 8dc696e108f09a95582d7c9f1f8a3c8bf2d77a5dca4a5fbd4ca668a7229fdd78
Client is 0ff02476d24619f4e34d2963a8f010121e447ed543133c248d9d926f0fbd1c69
Listening on 0.0.0.0:7500
Server recv'd: Hello Cable world!
Client closed gracefully
Server closed gracefully
Client socket closed
Server socket closed
```

# Command Line Interface (CLI)
One can be found in `./examples/cli.ts` for testing or debug purposes. It uses stdin and stdout for communication. Two instances of this program could be piped into each other using [dupsh](https://www.npmjs.com/package/dupsh):

```
$ tsc
$ export PSK=4fccf9a246e0e14b440a9faa1119e9fed42e0dd8a4ce6d54b73f843c60f57b88
$ dupsh \
  'node examples/cli.js $PSK initiator "British Left Waffles on Falkland Islands"' \
  'node examples/cli.js $PSK responder "The duke yet lives that Henry shall depose"'
```

# Debug Output
This module uses [debug](https://www.npmjs.com/package/debug). Debug output may be viewed by setting the `DEBUG` environment variable in your shell to, e.g.
```
export DEBUG=cable-handshake:*   # short for DEBUG=cable-handshake:I,cable-handshake-R
```
The two used debug namespaces are `cable-handshake:I` for the handshake initiator, and `cable-handshake-R` for the responder.

# Notes
This module hasn't been tested in an environment other than Node.js. `Buffer`s
are used and haven't been tested against `Uint8Array`s on the browser. Making
this module work in the browser would be a welcome contribution!

# Development Dependencies
The Rust integration tests require at least `rustc >= 1.75.0` and `cargo >= 1.75.0`.

# License
AGPL-3.0

