# cable-handshake.ts

Work-in-Progress

## API

### `const hs = new Handshake(key: NoiseState.KeyPair, psk: Buffer, initiator: boolean, stream: Duplex)`

### `const tx = await hs.handshake(): Promise<PostHandshakeTransport>`

### `tx.write(bytes: Buffer)`

### `tx.recv(): Promise<Buffer>`

## debug output
```
DEBUG=cable-handshake:*
```

## Notes
Assumes Node.js use in that `Buffer`s are used and haven't been tested against
`Uint8Array`s on the browser. Making this module work in the browser would be a
welcome contribution!

## License

AGPL-3.0
