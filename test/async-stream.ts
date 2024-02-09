import tape from 'tape'
import { AsyncStream } from '../src/async-stream.js'
import { Throttle, ErrorStream, briefly } from './util.js'

tape('write+read with stream end', async t => {
  t.plan(5)

  const stream = new Throttle(100)
  const astream = new AsyncStream(stream)

  astream.write('varnished')
  astream.write('victuals,')
  astream.write('vamos!')

  t.equals((await astream.read(8)).toString(), 'varnishe')
  t.equals((await astream.read(8)).toString(), 'dvictual')
  t.equals((await astream.read(2)).toString(), 's,')
  t.equals((await astream.read(6)).toString(), 'vamos!')
  astream.read(10)
    .catch(err => t.ok(err, 'read fail ok'))

  stream.end()

  await briefly()
})

tape('handle error', async t => {
  t.plan(5)

  const stream = new ErrorStream()
  const astream = new AsyncStream(stream)

  astream.write('hello')
  astream.write('world')
  astream.write('party')

  stream.on('error', err => {
    t.equals(err.message, 'intentional error', 'error ok')
  })

  try {
    t.equals((await astream.read(3)).toString(), 'hel', 'hel ok')
    t.equals((await astream.read(4)).toString(), 'lowo', 'lowo ok')
    t.equals((await astream.read(3)).toString(), 'rld', 'rld ok')
    stream.write('break')
    t.error(await astream.read(10))
  } catch (err: any) {
    t.equals(err.message, 'stream has errored', 'error ok')
  }

  await briefly()
})

tape('multiple readers', async t => {
  t.plan(3)

  const stream = new Throttle(10)
  const astream = new AsyncStream(stream)

  astream.write('approbate')
  astream.write('all')
  astream.write('artefacts')
  stream.end()

  astream.read(9)
    .then(buf => t.equals(buf.toString(), 'approbate'))
    .catch(err => t.error(err))
  astream.read(6)
    .then(buf => t.equals(buf.toString(), 'allart'))
    .catch(err => t.error(err))
  astream.read(6)
    .then(buf => t.equals(buf.toString(), 'efacts'))
    .catch(err => t.error(err))

  await briefly()
})

