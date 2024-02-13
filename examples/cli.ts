import { Handshake } from '../src/handshake.js'
import duplexer from 'duplexer3'
import fs from 'fs'

if (process.argv.length < 4) {
  console.error(`USAGE: ${process.argv[0]} ${process.argv[1]} PSK initiator|responder MSG-TO-SEND`)
  console.error(`USAGE: ${process.argv[0]} ${process.argv[1]} PSK initiator|responder @FILENAME`)
  process.exit(1)
}

const IS_INITIATOR = process.argv[3] === 'initiator'
const PSK = Buffer.from(process.argv[2], 'hex')
const MSG = process.argv[4].startsWith('@') ? fs.readFileSync(process.argv[4].slice(1), 'utf8') : process.argv[4]

async function run() {
  const key = Handshake.generateKeyPair()
  const keyStr = key.publicKey.toString('hex').slice(0, 8)

  const stream = duplexer(process.stdout, process.stdin)
  stream.once('close', () => {
    console.error(`${keyStr}: stream closed`)
  })
  stream.once('error', (err) => {
    console.error(`${keyStr}: stream errored: ${err}`)
  })

  console.error(`${keyStr}: ${IS_INITIATOR ? 'initiator' : 'responder'} ready!`)
  const hs = new Handshake(key, PSK, IS_INITIATOR, stream)
  const tx = await hs.handshake()

  if (IS_INITIATOR) {
    await tx.write(MSG)
    console.error(`${keyStr}: got "${(await tx.read()).toString()}"`)
    await tx.readEos()
    console.error(`${keyStr}: got eos`)
    await tx.writeEos()
    console.error(`${keyStr}: wrote eos`)
  } else {
    console.error(`${keyStr}: got "${(await tx.read()).toString()}"`)
    await tx.write(MSG)
    console.error(`${keyStr}: wrote msg`)
    await tx.writeEos()
    console.error(`${keyStr}: wrote eos`)
    await tx.readEos()
    console.error(`${keyStr}: got eos`)
  }
}

run()

