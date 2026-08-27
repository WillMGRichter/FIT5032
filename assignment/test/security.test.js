import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char)
}

function isSafeUrl(url, origin = 'http://localhost:5173') {
  if (typeof url !== 'string' || url.trim() === '') return false
  try {
    const parsed = new URL(url, origin)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

describe('escapeHtml', () => {
  it('converts <script> tags to harmless text', () => {
    const input = "<script>alert('XSS')</script>"
    const result = escapeHtml(input)
    assert.ok(!result.includes('<script>'))
    assert.ok(result.includes('&lt;script&gt;'))
  })

  it('converts <img onerror> to harmless text', () => {
    const input = '<img src=x onerror=alert("XSS")>'
    const result = escapeHtml(input)
    assert.ok(!result.includes('<img'))
    assert.ok(result.includes('&lt;img'))
  })

  it('escapes ampersands', () => {
    assert.equal(escapeHtml('a & b'), 'a &amp; b')
  })

  it('escapes double quotes', () => {
    assert.equal(escapeHtml('say "hello"'), 'say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    assert.equal(escapeHtml("it's"), 'it&#39;s')
  })

  it('handles null and undefined', () => {
    assert.equal(escapeHtml(null), '')
    assert.equal(escapeHtml(undefined), '')
  })

  it('preserves safe text', () => {
    assert.equal(escapeHtml('Hello World'), 'Hello World')
  })

  it('converts nested tags to harmless text', () => {
    const input = '<div><script>alert(1)</script></div>'
    const result = escapeHtml(input)
    assert.ok(!result.includes('<script>'))
    assert.ok(!result.includes('<div>'))
  })

  it('converts angle brackets around event handlers to harmless text', () => {
    const input = '<div onclick="alert(1)">click</div>'
    const result = escapeHtml(input)
    assert.ok(!result.includes('<div'))
    assert.ok(!result.includes('</div>'))
  })

  it('converts SVG onload to harmless text', () => {
    const input = '<svg onload=alert(1)>'
    const result = escapeHtml(input)
    assert.ok(!result.includes('<svg'))
    assert.ok(result.includes('&lt;svg'))
  })
})

describe('isSafeUrl', () => {
  it('allows http URLs', () => {
    assert.ok(isSafeUrl('http://example.com/image.jpg'))
  })

  it('allows https URLs', () => {
    assert.ok(isSafeUrl('https://example.com/image.jpg'))
  })

  it('rejects javascript: protocol', () => {
    assert.equal(isSafeUrl("javascript:alert('XSS')"), false)
  })

  it('rejects data: protocol', () => {
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false)
  })

  it('rejects vbscript: protocol', () => {
    assert.equal(isSafeUrl('vbscript:msgbox(1)'), false)
  })

  it('rejects empty strings', () => {
    assert.equal(isSafeUrl(''), false)
  })

  it('rejects non-string inputs', () => {
    assert.equal(isSafeUrl(null), false)
    assert.equal(isSafeUrl(undefined), false)
    assert.equal(isSafeUrl(123), false)
  })
})

describe('XSS input catalogue — escapeHtml renders harmlessly', () => {
  const payloads = [
    { input: '<script>alert("XSS")</script>', desc: 'script tag' },
    { input: '<img src=x onerror=alert("XSS")>', desc: 'img onerror' },
    { input: '<svg onload=alert("XSS")>', desc: 'svg onload' },
    { input: '"><script>alert("XSS")</script>', desc: 'attribute breakout script' },
    { input: "';alert('XSS')//", desc: 'JS string breakout' },
    { input: '<iframe src="javascript:alert(\'XSS\')">', desc: 'iframe with javascript src' },
    { input: '<body onload=alert("XSS")>', desc: 'body onload' },
    { input: '<input onfocus=alert("XSS") autofocus>', desc: 'input onfocus' },
    { input: '<details open ontoggle=alert("XSS")>', desc: 'details ontoggle' },
  ]

  payloads.forEach(({ input, desc }) => {
    it(`escapes ${desc}: angle brackets become entities`, () => {
      const escaped = escapeHtml(input)
      assert.ok(!escaped.includes('<'), `${desc}: still contains raw <`)
      assert.ok(!escaped.includes('>'), `${desc}: still contains raw >`)
    })
  })
})

describe('XSS input catalogue — isSafeUrl rejects dangerous protocols', () => {
  const dangerousUrls = [
    { input: 'javascript:alert("XSS")', desc: 'javascript protocol' },
    { input: 'data:text/html,<script>alert(1)</script>', desc: 'data protocol' },
    { input: 'vbscript:msgbox(1)', desc: 'vbscript protocol' },
  ]

  dangerousUrls.forEach(({ input, desc }) => {
    it(`rejects ${desc}`, () => {
      assert.equal(isSafeUrl(input), false)
    })
  })

  const safeUrls = [
    { input: 'https://example.com/photo.jpg', desc: 'https URL' },
    { input: 'http://example.com/photo.jpg', desc: 'http URL' },
  ]

  safeUrls.forEach(({ input, desc }) => {
    it(`allows ${desc}`, () => {
      assert.ok(isSafeUrl(input))
    })
  })
})
