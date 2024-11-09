import { Handshake } from '../src/handshake.js'
import net from 'net'
import fs from 'fs'

const PSK = Buffer.alloc(32).fill(0x08)
const SOCKET_PATH = '/tmp/handshake.sock'
const MSG_1 = "An impeccably polite pangolin"
const MSG_2 = Buffer.alloc(77_777).fill(7)

async function client() {
  const key = Handshake.generateKeyPair()

  const socket = net.connect(SOCKET_PATH)
  socket.setNoDelay(true)

  const hs = new Handshake(key, PSK, true, socket)
  const tx = await hs.handshake()

  for (let i=0; i < 5_000; i++) {
    await tx.write(MSG_1)
    await tx.read()
  }

  await tx.readEos()
  await tx.writeEos()
}

async function server() {
  const key = Handshake.generateKeyPair()

  const server = net.createServer(async socket => {
    const timeStr = '1 handshake             10,000 messages'

    socket.setNoDelay(true)
    console.time(timeStr)
    const hs = new Handshake(key, PSK, false, socket)
    const tx = await hs.handshake()

    socket.once('close', () => {
      server.close()
    })

    for (let i=0; i < 5_000; i++) {
      await tx.read()
      await tx.write(MSG_2)
    }
    console.timeEnd(timeStr)

    await tx.writeEos()
    await tx.readEos()
    socket.end()
  })

  server.listen(SOCKET_PATH)
}

try {
  fs.unlinkSync(SOCKET_PATH)
} catch (_) {}
server()
client()

