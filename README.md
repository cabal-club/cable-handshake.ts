# cable-handshake.ts (WIP)

Implements 1.0-draft5 of the [Cable Handshake Protocol](https://github.com/cabal-club/cable/blob/main/handshake.md).

**WARNING**: Incomplete! Still in draft status.

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

## `postHandshakeTransport.write(bytes: Buffer)`
Writes an encrypted message to the remote peer.

## `postHandshakeTransport.recv(): Promise<Buffer>`
Reads an encrypted message from the remote peer.

## `postHandshakeTransport.destroy()`
Terminates the connection to the remote peer gracefully. This includes sending an end-of-stream marker so the remote knows it was an intentional close.

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

# License
AGPL-3.0

