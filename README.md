# cable-handshake.ts

Work-in-Progress

## API

### `const hs = new Handshake(key: NoiseState.KeyPair, psk: Buffer, initiator: boolean, stream: Duplex)`

### `const tx = await hs.handshake(): Promise<PostHandshakeTransport>`

### `tx.write(bytes: Buffer)`

### `tx.recv(): Promise<Buffer>`

## debug
```
DEBUG=cable-handshake:*
```

## License

AGPL-3.0
