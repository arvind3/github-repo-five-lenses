importScripts(
  'engine/fetcher.js',
  'engine/analyzer.js',
  'engine/generator.js',
  'lib/jszip.min.js'
)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'generatePages') {
    handleGeneration(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }))
    return true
  }
  return false
})

async function handleGeneration(payload) {
  const { repoUrl, context = {} } = payload || {}
  const startTime = Date.now()

  const progress = (step, status, message) => {
    chrome.runtime.sendMessage({ action: 'progress', step, status, message })
  }

  try {
    progress(1, 'loading', 'Fetching repository metadata...')
    const rawData = await fetchRepoData(repoUrl)
    progress(1, 'done', 'Metadata loaded')

    progress(2, 'loading', 'Reading README and file structure...')
    progress(2, 'done', 'Structure analyzed')

    progress(3, 'loading', 'Running analysis engine...')
    const analysis = analyzeRepo(rawData, context)
    progress(3, 'done', 'Analysis complete')

    progress(4, 'loading', 'Generating 5 awareness pages...')
    const pages = generateAllPages(analysis)
    progress(4, 'done', 'Pages ready')

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const meta = {
      repoName: analysis.meta.fullName,
      generatedAt: new Date().toISOString(),
      elapsed
    }

    await chrome.storage.local.set({
      repolens_pages: pages,
      repolens_meta: meta
    })

    chrome.runtime.sendMessage({
      action: 'complete',
      pages,
      repoName: analysis.meta.fullName,
      elapsed
    })
  } catch (error) {
    const normalized = normalizeError(error)
    chrome.runtime.sendMessage({
      action: 'error',
      code: normalized.code,
      message: normalized.message
    })
  }
}

function normalizeError(error) {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again.'
    }
  }

  if (error.code) {
    return {
      code: error.code,
      message: error.message || 'Something went wrong. Please try again.'
    }
  }

  if (String(error.message || '').toLowerCase().includes('network')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Connection failed. Check your internet connection.'
    }
  }

  return {
    code: 'UNKNOWN',
    message: error.message || 'Something went wrong. Please try again.'
  }
}
