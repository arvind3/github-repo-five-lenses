const path = require('path')
const fs = require('fs')
const http = require('http')
const { test, expect } = require('@playwright/test')

const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const port = 4173
const baseUrl = `http://${host}:${port}/docs/`

let server

test.beforeAll(async () => {
  server = await startStaticServer(repoRoot, host, port)
})

test.afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
})

test('web page validates URL and generates report pages', async ({ page }) => {
  test.setTimeout(180000)
  await page.goto(baseUrl)

  await page.locator('#repoUrl').fill('https://example.com/nope')
  await page.locator('#repoUrl').blur()
  await expect(page.locator('#urlError')).toBeVisible()

  await page.locator('#repoUrl').fill('https://github.com/arvind3/fakerUI')
  await page.locator('#repoUrl').blur()
  await expect(page.locator('#urlError')).toBeHidden()

  await page.locator('#generateBtn').click()
  await expect(page.locator('#resultsPanel')).toBeVisible({ timeout: 150000 })
  await expect(page.locator('#pageRows .row')).toHaveCount(5)
  await expect(page.locator('#previewPanel')).toBeVisible()
  await expect(page.locator('#previewFrame')).toHaveAttribute('srcdoc', /<!DOCTYPE html>/)
})

function startStaticServer(rootDir, listenHost, listenPort) {
  const mimeTypes = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain'
  }

  const serverInstance = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0])
    const relativePath = requestPath === '/' ? '/docs/index.html' : requestPath
    const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '')
    let filePath = path.join(rootDir, safePath)

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
      return
    }

    const extension = path.extname(filePath).toLowerCase()
    const mime = mimeTypes[extension] || 'application/octet-stream'
    res.writeHead(200, { 'content-type': `${mime}; charset=utf-8` })
    fs.createReadStream(filePath).pipe(res)
  })

  return new Promise((resolve, reject) => {
    serverInstance.once('error', reject)
    serverInstance.listen(listenPort, listenHost, () => {
      resolve(serverInstance)
    })
  })
}
