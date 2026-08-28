const assert = require('node:assert')
const lib = require('./src/lib')

let passed = 0
let failed = 0
const failures = []

const secrets = {
  SENDGRID_API_KEY: 'SG.test-key-only-for-local-harness',
  SENDGRID_FROM_EMAIL: 'noreply@greenlink.test',
  EMAIL_HMAC_SECRET: 'test-hmac-secret',
}

const admin = { uid: 'uid-admin', role: 'admin' }
const member = { uid: 'uid-member', role: 'member' }

function sentMessages(provider) {
  return provider.sent.flat()
}

async function check(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    console.log(`FAIL  ${name}: ${error.message}`)
  }
}

function makeProvider() {
  return {
    sent: [],
    async send(messages) {
      this.sent.push(Array.isArray(messages) ? messages : [messages])
    },
  }
}

const validBody = {
  kind: 'broadcast',
  recipients: [{ email: 'alice@example.com' }, { email: 'ALICE@example.com' }, { email: 'bob@example.com' }],
  subject: 'Greening volunteer callout',
  message: 'Join us on Saturday morning to plant native trees.',
}

async function main() {
  console.log('sendGreenLinkEmail - local test harness (mock provider, no live SendGrid)')

  await check('rejects with 401 when not authenticated', async () => {
    const provider = makeProvider()
    await assert.rejects(
      lib.handleSendEmail({ body: validBody, decoded: null, secrets, provider }),
      (error) => error.status === 401 && error.code === 'UNAUTHENTICATED',
    )
  })

  await check('rejects member broadcast with 403', async () => {
    const provider = makeProvider()
    await assert.rejects(
      lib.handleSendEmail({ body: validBody, decoded: member, secrets, provider }),
      (error) => error.status === 403 && error.code === 'FORBIDDEN',
    )
  })

  await check('rejects admin broadcast with 400 when subject missing', async () => {
    const provider = makeProvider()
    const body = { kind: 'broadcast', recipients: validBody.recipients, message: 'Hello' }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: admin, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED' && Boolean(error.details.subject),
    )
  })

  await check('rejects broadcast with 400 when recipients invalid', async () => {
    const provider = makeProvider()
    const body = { ...validBody, recipients: [{ email: 'nope' }, { email: '' }] }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: admin, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED' && Boolean(error.details.recipients),
    )
  })

  await check('rejects 400 when no recipients', async () => {
    const provider = makeProvider()
    const body = { ...validBody, recipients: [] }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: admin, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED',
    )
  })

  await check('rejects 400 when attachment larger than 10 MiB', async () => {
    const provider = makeProvider()
    const body = {
      ...validBody,
      attachments: [
        {
          filename: 'big.pdf',
          type: 'application/pdf',
          content: Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64'),
        },
      ],
    }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: admin, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED' && Boolean(error.details.attachments),
    )
  })

  await check('rejects 400 when too many attachments', async () => {
    const provider = makeProvider()
    const attachments = Array.from({ length: 6 }, (_, i) => ({
      filename: `file${i}.txt`,
      type: 'text/plain',
      content: Buffer.from('hello').toString('base64'),
    }))
    await assert.rejects(
      lib.handleSendEmail({ body: { ...validBody, attachments }, decoded: admin, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED' && Boolean(error.details.attachments),
    )
  })

  await check('rejects 400 when attachment type disallowed', async () => {
    const provider = makeProvider()
    const body = {
      ...validBody,
      attachments: [{ filename: 'evil.sh', type: 'application/x-sh', content: Buffer.from('x').toString('base64') }],
    }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: admin, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED' && Boolean(error.details.attachments),
    )
  })

  await check('returns 503 when SendGrid key missing', async () => {
    const provider = makeProvider()
    const noKey = { ...secrets, SENDGRID_API_KEY: '' }
    await assert.rejects(
      lib.handleSendEmail({ body: validBody, decoded: admin, secrets: noKey, provider }),
      (error) => error.status === 503 && error.code === 'EMAIL_UNCONFIGURED',
    )
  })

  await check('admin broadcast sends deduplicated 200', async () => {
    const provider = makeProvider()
    const result = await lib.handleSendEmail({ body: validBody, decoded: admin, secrets, provider })
    assert.strictEqual(result.status, 200)
    assert.strictEqual(result.body.ok, true)
    assert.strictEqual(result.body.to, 2)
    const msgs = sentMessages(provider)
    assert.strictEqual(msgs.length, 2)
    assert.deepStrictEqual(
      msgs.map((m) => m.to).sort(),
      ['alice@example.com', 'bob@example.com'],
    )
    assert.strictEqual(msgs[0].from, secrets.SENDGRID_FROM_EMAIL)
    assert.ok(msgs[0].html.includes('Join us on Saturday'))
  })

  await check('admin broadcast handles inline attachments', async () => {
    const provider = makeProvider()
    const body = {
      ...validBody,
      attachments: [
        { filename: 'flyer.txt', type: 'text/plain', content: Buffer.from('plant trees').toString('base64') },
      ],
    }
    const result = await lib.handleSendEmail({ body, decoded: admin, secrets, provider })
    assert.strictEqual(result.body.ok, true)
    const msgs = sentMessages(provider)
    assert.strictEqual(msgs[0].attachments[0].filename, 'flyer.txt')
    assert.strictEqual(msgs[0].attachments[0].disposition, 'attachment')
  })

  await check('confirmation to self passes 200', async () => {
    const provider = makeProvider()
    const body = {
      kind: 'confirmation',
      to: { uid: 'uid-member', email: 'member@example.com' },
      user: { name: 'Jane Member' },
      project: { title: 'Carlton Community Garden', location: 'Carlton North', startDate: '2026-09-05' },
    }
    const decoded = { uid: 'uid-member', role: 'member' }
    const result = await lib.handleSendEmail({ body, decoded, secrets, provider })
    assert.strictEqual(result.status, 200)
    assert.strictEqual(result.body.to, 1)
    const msgs = sentMessages(provider)
    assert.strictEqual(msgs[0].to, 'member@example.com')
    assert.ok(msgs[0].subject.includes('Carlton Community Garden'))
    assert.ok(msgs[0].html.includes('2026-09-05'))
  })

  await check('confirmation to another user is rejected 403', async () => {
    const provider = makeProvider()
    const body = {
      kind: 'confirmation',
      to: { uid: 'uid-other', email: 'other@example.com' },
      user: { name: 'Jane Member' },
      project: { title: 'Carlton Community Garden', location: 'Carlton North' },
    }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: member, secrets, provider }),
      (error) => error.status === 403 && error.code === 'FORBIDDEN',
    )
  })

  await check('confirmation missing fields rejected 400', async () => {
    const provider = makeProvider()
    const body = { kind: 'confirmation', to: { uid: 'uid-member', email: 'no' }, user: { name: '' }, project: {} }
    await assert.rejects(
      lib.handleSendEmail({ body, decoded: member, secrets, provider }),
      (error) => error.status === 400 && error.code === 'VALIDATION_FAILED' && Boolean(error.details.to),
    )
  })

  await check('backend signature permits project email for non-admin', async () => {
    const provider = makeProvider()
    const payload = {
      kind: 'project',
      projectId: 7,
      recipients: [{ email: 'volunteer@example.com' }],
      subject: 'Project update',
      message: 'We moved the meeting point.',
      exp: Math.floor(Date.now() / 1000) + 120,
    }
    const body = { ...payload, signature: lib.sign(secrets.EMAIL_HMAC_SECRET, payload) }
    const result = await lib.handleSendEmail({ body, decoded: member, secrets, provider })
    assert.strictEqual(result.body.ok, true)
    assert.strictEqual(result.body.to, 1)
  })

  await check('tampered signature fails verification', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = { kind: 'project', projectId: 7, recipients: [{ email: 'v@example.com' }], subject: 's', message: 'm', exp: now + 120 }
    const body = { ...payload, signature: lib.sign(secrets.EMAIL_HMAC_SECRET, payload) }
    body.signature = body.signature.slice(0, -2) + '=='
    assert.strictEqual(lib.verifySignature(secrets.EMAIL_HMAC_SECRET, body), false)
  })

  await check('expired signature fails verification', async () => {
    const now = Math.floor(Date.now() / 1000)
    const payload = { kind: 'project', projectId: 7, recipients: [{ email: 'v@example.com' }], subject: 's', message: 'm', exp: now - 600 }
    const body = { ...payload, signature: lib.sign(secrets.EMAIL_HMAC_SECRET, payload) }
    assert.strictEqual(lib.verifySignature(secrets.EMAIL_HMAC_SECRET, body), false)
  })

  console.log('')
  console.log(`${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    for (const { name, error } of failures) {
      console.log(`- ${name}: ${error.message}`)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('harness crashed:', error)
  process.exitCode = 1
})