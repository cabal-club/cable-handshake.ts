import { Handshake } from '../src/handshake.js'
import duplexer from 'duplexer3'

if (process.argv.length < 4) {
  console.error(`USAGE: ${process.argv[0]} ${process.argv[1]} PSK initiator|responder "MSG-TO-SEND"`)
  process.exit(1)
}

const IS_INITIATOR = process.argv[3] === 'initiator'
const PSK = Buffer.from(process.argv[2], 'hex')
const MSG = process.argv.slice(4).join(' ')

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
    await tx.writeEos()
  } else {
    console.error(`${keyStr}: got "${(await tx.read()).toString()}"`)
    await tx.write(MSG)

    const eos = await tx.read()
    if (!eos.length) console.error('closed ok')
    else console.error('failed to get end-of-stream marker')
  }
}

run()

