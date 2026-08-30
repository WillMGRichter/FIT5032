import puppeteer from 'puppeteer-core'
import axe from 'axe-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.A11Y_BASE || 'http://localhost:4173'
const OUT_DIR = process.argv[2] && process.argv[2].startsWith('--out=')
  ? process.argv[2].slice('--out='.length)
  : null
const ONLY = process.argv.find((a) => a.startsWith('--only='))
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/discover', name: 'discover' },
  { path: '/projects/1', name: 'project-details' },
  { path: '/plants', name: 'plants' },
  { path: '/about', name: 'about' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
]

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900'],
  })

  const results = {}
  for (const route of ROUTES) {
    if (ONLY && !route.path.includes(ONLY.slice('--only='.length))) continue
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    const url = `${BASE}${route.path}`
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
    } catch (error) {
      console.log(`${route.name}: ${error.message}`)
      await page.close()
      continue
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await page.evaluate((axeSource) => {
      const script = document.createElement('script')
      script.textContent = axeSource
      document.head.appendChild(script)
    }, axe.source)
    const report = await page.evaluate(async () => {
      const res = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
      })
      return {
        violations: res.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          nodes: v.nodes.map((n) => n.target.join(' ')),
        })),
      }
    })
    results[route.name] = report
    console.log(`${route.name}: ${report.violations.length} violations`)
    for (const v of report.violations) {
      console.log(`  [${v.impact}] ${v.id} (${v.nodes.length})`)
    }
    await page.close()
  }

  await browser.close()

  if (OUT_DIR) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2))
    console.log(`Saved report to ${path.join(OUT_DIR, 'report.json')}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})