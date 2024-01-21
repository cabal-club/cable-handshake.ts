import tape from 'tape'
import { Handshake } from '../src/handshake.js'
import { FauxSocket } from './util.js'
import net from 'net'
import getPort from 'get-port'

function setup() {
  const a = new FauxSocket()
  const b = new FauxSocket()
  a.setPeer(b)
  b.setPeer(a)
  return { a, b }
}

tape('good handshake', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, PSK, true, a)

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, PSK, false, b)

  aHandshake.handshake()
    .then(async post => {
      t.ok(post)
      post.write(Buffer.from('hello world'))
      t.equals((await post.read()).toString(), 'world hello')
      post.destroy()
    })
    .catch(err => {
      t.error(err)
    })

  bHandshake.handshake()
    .then(async post => {
      t.ok(post)
      t.equals((await post.read()).toString(), 'hello world')
      post.write(Buffer.from('world hello'))
      await post.read()
    })
    .catch(err => {
      t.ok(err instanceof Error)
      t.equals(err.message, 'Connection gracefully terminated by remote', 'terminate ok')
    })
})

tape('different PSKs', t => {
  t.plan(2)

  const aPSK = Buffer.alloc(32).fill('A')
  const bPSK = Buffer.alloc(32).fill('B')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, aPSK, true, a)

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, bPSK, false, b)

  aHandshake.handshake()
    .then(_ => {
      t.fail('initiator should not complete')
    })
    .catch(err => {
      t.error(err, 'initiator should not fail')
    })

  bHandshake.handshake()
    .then(_ => {
      t.fail('responder should not complete')
    })
    .catch(err => {
      t.ok(err instanceof Error, 'error ok')
      t.equals(err.message, 'could not verify data', 'error msg ok')
    })
})

tape('different major versions', t => {
  t.plan(2)

  const PSK = Buffer.alloc(32).fill('A')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, PSK, true, a, Buffer.from([0x01, 0x00]))

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, PSK, false, b, Buffer.from([0x02, 0x00]))

  aHandshake.handshake()
    .then(_ => {
      t.fail('initiator should not complete')
    })
    .catch(err => {
      t.error(err, 'initiator should not fail')
    })

  bHandshake.handshake()
    .then(_ => {
      t.fail('responder should not complete')
    })
    .catch(err => {
      t.ok(err instanceof Error, 'error ok')
      t.equals(err.message, 'Expected remote version 2 but got 1', 'error msg ok')
    })
})

tape('different minor versions are ok', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, PSK, true, a, Buffer.from([0x01, 0x00]))

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, PSK, false, b, Buffer.from([0x01, 0x05]))

  aHandshake.handshake()
    .then(async post => {
      t.ok(post)
      post.write(Buffer.from('hello world'))
      t.equals((await post.read()).toString(), 'world hello')
    })
    .catch(err => {
      t.error(err)
    })

  bHandshake.handshake()
    .then(async post => {
      t.ok(post)
      t.equals((await post.read()).toString(), 'hello world')
      post.write(Buffer.from('world hello'))
    })
    .catch(err => {
      t.error(err)
    })
})

tape('try to reuse good handshake state', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, PSK, true, a)

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, PSK, false, b)

  aHandshake.handshake()
    .then(async post => {
      t.ok(post)
      try {
        await aHandshake.handshake()
      } catch (err) {
        t.ok(err instanceof Error, 'is error ok')
        t.equals((err as Error).message, 'Invalid state: expected Start but got Done', 'failed to reuse handshake ok')
      }
    })
    .catch(err => {
      t.error(err)
    })

  bHandshake.handshake()
    .then(async post => {
      t.ok(post)
    })
    .catch(err => {
      t.error(err)
    })
})

tape('try to reuse bad handshake state', t => {
  t.plan(3)

  const aPSK = Buffer.alloc(32).fill('A')
  const bPSK = Buffer.alloc(32).fill('B')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, aPSK, true, a)

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, bPSK, false, b)

  aHandshake.handshake()
    .then(_ => {
      t.fail('A should not have finished')
    })
    .catch(_ => {
      t.fail('A should not have failed')
    })

  bHandshake.handshake()
    .then(_ => {
      t.fail('B should not have finished')
    })
    .catch(async err => {
      t.ok(err, 'B failed ok')
      try {
        await bHandshake.handshake()
      } catch (err) {
        t.ok(err instanceof Error, 'is error ok')
        t.equals((err as Error).message, 'Invalid state: expected Start but got Failed', 'failed to reuse handshake ok')
      }
    })
})

tape('stream end during handshake', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, PSK, true, a)

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, PSK, false, b)

  aHandshake.handshake()
    .then(_ => {
      t.fail('A should not have finished')
    })
    .catch(err => {
      t.ok(err instanceof Error, 'is error ok')
      t.equals((err as Error).message, 'simulated disconnect', 'handshake failed ok')
    })

  bHandshake.handshake()
    .then(_ => {
      t.fail('B should not have finished')
    })
    .catch(err => {
      t.ok(err instanceof Error, 'is error ok')
      t.equals((err as Error).message, 'simulated disconnect', 'handshake failed ok')
    })

  process.nextTick(() => {
    a.destroy(new Error('simulated disconnect'))
    b.destroy(new Error('simulated disconnect'))
  })
})

tape('ensure fragmentation works due to long message', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')
  const { a, b } = setup()

  const aKey = Handshake.generateKeyPair()
  const aHandshake = new Handshake(aKey, PSK, true, a)

  const bKey = Handshake.generateKeyPair()
  const bHandshake = new Handshake(bKey, PSK, false, b)

  // Randomized 90kb payload
  const PAYLOAD = Buffer.from((new Array(90_000)).map(_ => Math.floor(Math.random() * 256)))

  aHandshake.handshake()
    .then(async post => {
      t.ok(post)
      post.write(PAYLOAD)
      t.equals((await post.read()).toString(), 'recv ok', 'ack ok')
    })
    .catch(err => {
      t.error(err)
    })

  bHandshake.handshake()
    .then(async post => {
      t.ok(post)
      t.ok(PAYLOAD.equals(await post.read()), 'payload received ok')
      post.write(Buffer.from('recv ok'))
    })
    .catch(err => {
      t.error(err)
    })
})

tape('handshake concludes properly when destroyed', t => {
  t.plan(1)

  getPort()
    .then(async port => {
      const PSK = Buffer.alloc(32).fill(0x08)
      const clientKey = Handshake.generateKeyPair()
      const serverKey = Handshake.generateKeyPair()

      const server = net.createServer(async socket => {
        const hs = new Handshake(serverKey, PSK, false, socket)
        const tx = await hs.handshake()

        socket.once('close', () => {
          console.log('server socket closed')
          server.close()
        })

        const msg = (await tx.read()).toString()
        t.equals(msg, 'Hello Cable world!', 'received string ok')

        tx.destroy()
      }).listen(port)

      const socket = net.connect({ host: 'localhost', port })
      const hs = new Handshake(clientKey, PSK, true, socket)
      const tx = await hs.handshake()

      tx.write(Buffer.from('Hello Cable world!'))

      socket.once('close', () => {
        console.log('client socket closed')
      })
    })
    .catch(err => {
      t.error(err, 'should not have failed to get port')
    })
})

