import tape from 'tape'
import { Handshake } from '../src/handshake.js'
import { Noise } from '../src/noise.js'
import net from 'net'
import getPort from 'get-port'

function setup(): Promise<{a: net.Socket, b: net.Socket}> {
  let a: net.Socket
  let b: net.Socket
  return new Promise((resolve, _) => {
    getPort().then(port => {
      const server = net.createServer(socket => {
        a = socket
        socket.once('close', () => {
          server.close()
        })
        resolve({a, b})
      }).listen(port)
      b = net.connect({ host: 'localhost', port })
    })
  })
}

tape('good handshake', t => {
  t.plan(6)

  const PSK = Buffer.alloc(32).fill('A')

  setup().then(({a, b}) => {
    const aKey = Handshake.generateKeyPair()
    const aHandshake = new Handshake(aKey, PSK, true, a)

    const bKey = Handshake.generateKeyPair()
    const bHandshake = new Handshake(bKey, PSK, false, b)

    aHandshake.handshake()
      .then(async post => {
        t.ok(post)
        post.write(Buffer.from('hello world'))
        t.equals((await post.read()).toString(), 'world hello')
        await post.writeEos()
        await post.readEos()
        t.pass('handshake ended ok')
        a.end()
      })
      .catch(err => {
        t.error(err)
      })

    bHandshake.handshake()
      .then(async post => {
        t.ok(post)
        t.equals((await post.read()).toString(), 'hello world')
        post.write(Buffer.from('world hello'))
        await post.readEos()
        await post.writeEos()
        t.pass('got eos ok')
        b.end()
      })
      .catch(err => {
        t.error(err)
      })
  })
})

tape('different PSKs', t => {
  t.plan(3)

  const aPSK = Buffer.alloc(32).fill('A')
  const bPSK = Buffer.alloc(32).fill('B')

  setup().then(({a, b}) => {
    const aKey = Handshake.generateKeyPair()
    const aHandshake = new Handshake(aKey, aPSK, true, a)

    const bKey = Handshake.generateKeyPair()
    const bHandshake = new Handshake(bKey, bPSK, false, b)

    aHandshake.handshake()
      .then(_ => {
        t.fail('initiator should not complete')
      })
      .catch(err => {
        t.equals(err.message, 'stream has ended', 'stream ended ok')
      })

    bHandshake.handshake()
      .then(_ => {
        t.fail('responder should not complete')
      })
      .catch(err => {
        t.ok(err instanceof Error, 'error ok')
        t.equals(err.message, 'could not verify data', 'error msg ok')
        b.end()
      })
  })
})

tape('different major versions', t => {
  t.plan(3)

  const PSK = Buffer.alloc(32).fill('A')

  setup().then(({a, b}) => {
    const aKey = Handshake.generateKeyPair()
    const PROLOGUE = Buffer.from('CABLE5.2')
    const noise = new Noise(true, aKey, PSK, PROLOGUE)
    const aHandshake = new Handshake(aKey, PSK, true, a, noise)

    const bKey = Handshake.generateKeyPair()
    const bHandshake = new Handshake(bKey, PSK, false, b)

    aHandshake.handshake()
      .then(_ => {
        t.fail('initiator should not complete')
      })
      .catch(err => {
        t.equals(err.message, 'stream has ended', 'stream ended ok')
      })

    bHandshake.handshake()
      .then(_ => {
        t.fail('responder should not complete')
      })
      .catch(err => {
        t.ok(err instanceof Error, 'error ok')
        t.equals(err.message, 'could not verify data', 'error msg ok')
        b.end()
      })
  })
})

tape('try to reuse good handshake state', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')

  setup().then(({a, b}) => {
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
          t.equals((err as Error).message,
              'Invalid state: expected Start but got Done',
              'failed to reuse handshake ok')
          a.end()
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
})

tape('try to reuse bad handshake state', t => {
  t.plan(4)

  const aPSK = Buffer.alloc(32).fill('A')
  const bPSK = Buffer.alloc(32).fill('B')

  setup().then(({a, b}) => {
    const aKey = Handshake.generateKeyPair()
    const aHandshake = new Handshake(aKey, aPSK, true, a)

    const bKey = Handshake.generateKeyPair()
    const bHandshake = new Handshake(bKey, bPSK, false, b)

    aHandshake.handshake()
      .then(_ => {
        t.fail('A should not have finished')
      })
      .catch(err => {
        t.equals(err.message, 'stream has ended', 'stream ended ok')
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
          t.equals((err as Error).message,
              'Invalid state: expected Start but got Failed',
              'failed to reuse handshake ok')
          b.end()
        }
      })
  })
})

tape('stream end during handshake', t => {
  t.plan(4)

  const PSK = Buffer.alloc(32).fill('A')

  setup().then(({a, b}) => {
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
        t.equals((err as Error).message, 'simulated disconnect',
            'handshake failed ok')
      })

    bHandshake.handshake()
      .then(_ => {
        t.fail('B should not have finished')
      })
      .catch(err => {
        t.ok(err instanceof Error, 'is error ok')
        t.equals((err as Error).message, 'simulated disconnect',
            'handshake failed ok')
      })

    process.nextTick(() => {
      a.destroy(new Error('simulated disconnect'))
      b.destroy(new Error('simulated disconnect'))
    })
  })
})

tape('ensure fragmentation works due to long message', t => {
  t.plan(7)

  const PSK = Buffer.alloc(32).fill('A')

  setup().then(({a, b}) => {
    const aKey = Handshake.generateKeyPair()
    const aHandshake = new Handshake(aKey, PSK, true, a)

    const bKey = Handshake.generateKeyPair()
    const bHandshake = new Handshake(bKey, PSK, false, b)

    // Randomized 90kb payload
    const PAYLOAD = Buffer.from(
        (new Array(290_000)).map(_ => Math.floor(Math.random() * 256)))

    aHandshake.handshake()
      .then(async post => {
        t.ok(post)
        t.ok(PAYLOAD.equals(await post.read()), 'payload received ok')
        await post.write(PAYLOAD)
        t.equals((await post.read()).toString(), 'recv ok', 'ack ok')
        await post.writeEos()
        await post.readEos()
        t.pass('protocol end ok')
        a.end()
      })
      .catch(err => {
        t.error(err)
      })

    bHandshake.handshake()
      .then(async post => {
        t.ok(post)
        await post.write(PAYLOAD)
        t.ok(PAYLOAD.equals(await post.read()), 'payload received ok')
        await post.write(Buffer.from('recv ok'))
        await post.readEos()
        await post.writeEos()
        t.pass('protocol end ok')
      })
      .catch(err => {
        t.error(err)
      })
  })
})

