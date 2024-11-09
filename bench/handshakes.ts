import { Handshake } from '../src/handshake.js'
import net from 'net'
import fs from 'fs'

const PSK = Buffer.alloc(32).fill(0x08)
const SOCKET_PATH = '/tmp/handshake.sock'
const MSG_1 = "An impeccably polite pangolin"
const MSG_2 = Buffer.alloc(77_777).fill(7)

async function client(msgs: number) {
  const key = Handshake.generateKeyPair()

  const socket = net.connect(SOCKET_PATH)
  socket.setNoDelay(true)

  const hs = new Handshake(key, PSK, true, socket)
  const tx = await hs.handshake()

  for (let i=0; i < msgs; i++) {
    await tx.write(MSG_1)
    await tx.read()
  }

  await tx.readEos()
  await tx.writeEos()
}

async function server(msgs: number) {
  const key = Handshake.generateKeyPair()

  const server = net.createServer(async socket => {
    socket.setNoDelay(true)
    const hs = new Handshake(key, PSK, false, socket)
    const tx = await hs.handshake()

    socket.once('close', () => {
      server.close()
    })

    for (let i=0; i < msgs; i++) {
      await tx.read()
      await tx.write(MSG_2)
    }

    await tx.writeEos()
    await tx.readEos()
    socket.end()
  })

  server.listen(SOCKET_PATH)
}

async function run() {
  const msgs = 1
  const handshakes = 1000
  const timeStr = `${handshakes} handshakes    ${msgs*2} messages/handshake`

  console.time(timeStr)

  for (let i=0; i < handshakes; i++) {
    try {
      fs.unlinkSync(SOCKET_PATH)
    } catch (_) {}
    server(msgs)
    await client(msgs)
  }

  console.timeEnd(timeStr)
}
run()
