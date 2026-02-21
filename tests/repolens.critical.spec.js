const path = require('path')
const fs = require('fs')
const os = require('os')
const { test, expect, chromium } = require('@playwright/test')

const extensionPath = path.resolve(__dirname, '..', 'repolens')

let context
let extensionId

const reposUnderTest = [
  'https://github.com/arvind3/retail_analytics',
  'https://github.com/arvind3/fakerUI'
]

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
    throw new Error(`Extension manifest not found at ${extensionPath}`)
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-pw-'))
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker')
  }
  extensionId = new URL(serviceWorker.url()).hostname
})

test.afterAll(async () => {
  if (context) await context.close()
})

test('validates invalid GitHub URL format', async () => {
  const popupPage = await openPopupPage()
  await popupPage.getByLabel('Repository URL').fill('https://example.com/not-github')
  await popupPage.getByLabel('Repository URL').blur()

  await expect(popupPage.locator('#urlError')).toBeVisible()
  await expect(popupPage.locator('#urlError')).toContainText('Please enter a valid GitHub URL')
  await expect(popupPage.getByLabel('Repository URL')).toHaveClass(/invalid/)
  await popupPage.close()
})

for (const repoUrl of reposUnderTest) {
  test(`generates and stores pages for ${repoUrl}`, async () => {
    const popupPage = await openPopupPage()
    await resetToReadyState(popupPage)
    await popupPage.getByLabel('Repository URL').fill(repoUrl)
    await popupPage.getByLabel('Repository URL').blur()
    await expect(popupPage.locator('#urlError')).toBeHidden()

    await popupPage.evaluate(() => {
      document.querySelector('#generateBtn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForResultsWithoutError(popupPage)
    await expect(popupPage.locator('#resultsState')).toBeVisible()
    await expect(popupPage.locator('#pageRows .page-row')).toHaveCount(5)

    const storage = await popupPage.evaluate(async () => {
      return new Promise(resolve => {
        chrome.storage.local.get(['repolens_pages', 'repolens_meta'], resolve)
      })
    })

    expect(storage.repolens_pages).toBeTruthy()
    expect(storage.repolens_pages.index).toContain('<!DOCTYPE html>')
    expect(storage.repolens_pages.engineering).toContain('Engineering Perspective')
    expect(storage.repolens_pages.product).toContain('Product Perspective')
    expect(storage.repolens_pages.capability).toContain('Capability Perspective')
    expect(storage.repolens_pages.executive).toContain('Executive Perspective')
    expect(storage.repolens_meta.repoName).toContain('arvind3/')
    await popupPage.close()
  })
}

test('viewer renders engineering page from storage', async () => {
  const viewerPage = await context.newPage()
  await viewerPage.goto(`chrome-extension://${extensionId}/viewer.html?page=engineering`)

  await expect(viewerPage.locator('#pageFrame')).toBeVisible()
  await expect
    .poll(async () => {
      const srcdoc = await viewerPage.locator('#pageFrame').getAttribute('srcdoc')
      return srcdoc || ''
    })
    .toContain('Engineering Perspective')

  await expect(viewerPage.locator('#title')).toContainText('Engineering')
  await viewerPage.close()
})

async function waitForResultsWithoutError(page) {
  const results = page.locator('#resultsState')
  const error = page.locator('#errorState')
  const generating = page.locator('#generatingState')

  await expect
    .poll(async () => {
      if (await generating.isVisible()) return 'generating'
      if (await results.isVisible()) return 'results'
      if (await error.isVisible()) return 'error'
      return 'ready'
    }, {
      timeout: 20000,
      message: 'Expected popup to leave READY state after generation click'
    })
    .not.toBe('ready')

  await expect
    .poll(async () => {
      const resultsVisible = await results.isVisible()
      if (resultsVisible) return 'results'

      const errorVisible = await error.isVisible()
      if (errorVisible) {
        const message = await page.locator('#errorMessage').innerText()
        return `error:${message}`
      }
      return 'pending'
    }, {
      timeout: 140000,
      message: 'Expected extension to finish generation without hitting error state'
    })
    .toBe('results')
}

async function resetToReadyState(page) {
  if (await page.locator('#resultsState').isVisible()) {
    await page.locator('#analyzeAnotherBtn').click()
  } else if (await page.locator('#errorState').isVisible()) {
    await page.locator('#tryAgainBtn').click()
  } else if (await page.locator('#generatingState').isVisible()) {
    await page.locator('#cancelBtn').click()
  }
  await expect(page.locator('#readyState')).toBeVisible()
}

async function openPopupPage() {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  return page
}
