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

  server.listen(7500, undefined, undefined,
      () => console.log('Listening on 0.0.0.0:7500'))
}

server()
client()

