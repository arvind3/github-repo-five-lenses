const states = {
  ready: 'ready',
  generating: 'generating',
  results: 'results',
  error: 'error'
}

const errorMessages = {
  INVALID_URL: 'Please enter a valid GitHub URL: https://github.com/owner/repo',
  REPO_NOT_FOUND: "Repository not found. Make sure it's public and the URL is correct.",
  RATE_LIMIT: 'GitHub rate limit reached (60 req/hr). Wait a few minutes and try again.',
  GITHUB_ERROR: 'GitHub API error. Please try again.',
  NETWORK_ERROR: 'Connection failed. Check your internet connection.',
  UNKNOWN: 'Something went wrong. Please try again.'
}

const pageConfig = [
  { key: 'index', icon: '🏠', label: 'Hub Page', audience: 'All visitors' },
  { key: 'engineering', icon: '⚙️', label: 'Engineering', audience: 'Developers' },
  { key: 'product', icon: '📦', label: 'Product', audience: 'End users' },
  { key: 'capability', icon: '🔷', label: 'Capability', audience: 'Business strategy' },
  { key: 'executive', icon: '📊', label: 'Executive', audience: 'Leadership' }
]

const dom = {
  app: document.getElementById('app'),
  ready: document.getElementById('readyState'),
  generating: document.getElementById('generatingState'),
  results: document.getElementById('resultsState'),
  error: document.getElementById('errorState'),
  repoUrl: document.getElementById('repoUrl'),
  urlError: document.getElementById('urlError'),
  toggleContext: document.getElementById('toggleContext'),
  contextPanel: document.getElementById('contextPanel'),
  industry: document.getElementById('industry'),
  useCases: document.getElementById('useCases'),
  metrics: document.getElementById('metrics'),
  generateBtn: document.getElementById('generateBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  analyzeAnotherBtn: document.getElementById('analyzeAnotherBtn'),
  tryAgainBtn: document.getElementById('tryAgainBtn'),
  reportIssueBtn: document.getElementById('reportIssueBtn'),
  downloadZipBtn: document.getElementById('downloadZipBtn'),
  pageRows: document.getElementById('pageRows'),
  analyzingRepo: document.getElementById('analyzingRepo'),
  resultsRepo: document.getElementById('resultsRepo'),
  elapsedTime: document.getElementById('elapsedTime'),
  errorMessage: document.getElementById('errorMessage')
}

let currentState = states.ready
let cancelled = false
let latestPages = null
let latestMeta = null

init()

function init() {
  setState(states.ready)
  renderPageRows()

  dom.repoUrl.addEventListener('blur', () => validateUrl())
  dom.generateBtn.addEventListener('click', () => handleGenerate())
  dom.toggleContext.addEventListener('click', () => toggleContext())
  dom.cancelBtn.addEventListener('click', () => handleCancel())
  dom.analyzeAnotherBtn.addEventListener('click', () => resetForAnother())
  dom.tryAgainBtn.addEventListener('click', () => setState(states.ready))
  dom.reportIssueBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/arvind3/github-repo-five-lenses/issues' })
  })
  dom.downloadZipBtn.addEventListener('click', () => downloadZip())

  chrome.runtime.onMessage.addListener((message) => {
    if (cancelled) return
    handleRuntimeMessage(message)
  })
}

function setState(next) {
  currentState = next
  ;[dom.ready, dom.generating, dom.results, dom.error].forEach(section => section.classList.add('hidden'))
  if (next === states.ready) dom.ready.classList.remove('hidden')
  if (next === states.generating) dom.generating.classList.remove('hidden')
  if (next === states.results) dom.results.classList.remove('hidden')
  if (next === states.error) dom.error.classList.remove('hidden')
}

function toggleContext() {
  dom.contextPanel.classList.toggle('hidden')
  const expanded = !dom.contextPanel.classList.contains('hidden')
  dom.toggleContext.textContent = expanded ? '− Hide Context ▴' : '+ Add Context ▾'
}

function validateUrl() {
  const value = String(dom.repoUrl.value || '').trim()
  const valid = isValidGitHubRepoUrl(value)
  dom.repoUrl.classList.toggle('invalid', !valid && value.length > 0)
  dom.urlError.classList.toggle('hidden', valid || value.length === 0)
  dom.urlError.textContent = valid ? '' : errorMessages.INVALID_URL
  return valid
}

function isValidGitHubRepoUrl(url) {
  if (!url) return false
  const pattern = /^https:\/\/github\.com\/[^\/\s]+\/[^\/\s?#]+\/?$/i
  return pattern.test(url.trim())
}

async function handleGenerate() {
  if (!validateUrl()) return

  cancelled = false
  setState(states.generating)
  resetProgress()

  const repoUrl = dom.repoUrl.value.trim()
  dom.analyzingRepo.textContent = `analyzing: ${extractOwnerRepo(repoUrl)}`

  try {
    await chrome.runtime.sendMessage({
      action: 'generatePages',
      payload: {
        repoUrl,
        context: {
          industry: dom.industry.value.trim(),
          useCases: dom.useCases.value.trim(),
          metrics: dom.metrics.value.trim()
        }
      }
    })
  } catch (_err) {
    showError('NETWORK_ERROR')
  }
}

function handleCancel() {
  cancelled = true
  setState(states.ready)
}

function resetForAnother() {
  latestPages = null
  latestMeta = null
  setState(states.ready)
}

function handleRuntimeMessage(message) {
  if (!message || typeof message !== 'object') return
  if (message.action === 'progress') {
    markStep(message.step, message.status, message.message)
    return
  }
  if (message.action === 'complete') {
    handleComplete(message)
    return
  }
  if (message.action === 'error') {
    showError(message.code || 'UNKNOWN', message.message)
  }
}

function resetProgress() {
  document.querySelectorAll('.progress-list li').forEach(item => {
    item.classList.remove('done')
    const status = item.querySelector('.status')
    status.textContent = 'pending'
  })
}

function markStep(step, status, message) {
  const row = document.querySelector(`.progress-list li[data-step="${step}"]`)
  if (!row) return
  const statusNode = row.querySelector('.status')
  if (status === 'done') {
    row.classList.add('done')
    statusNode.textContent = message || 'done'
  } else if (status === 'error') {
    statusNode.textContent = 'error'
  } else {
    statusNode.textContent = 'in progress'
  }
}

async function handleComplete(message) {
  let pages = message.pages
  if (!pages) {
    const storage = await chrome.storage.local.get(['repolens_pages'])
    pages = storage.repolens_pages
  }

  if (!pages) {
    showError('UNKNOWN', 'Generation completed but no pages were found in local storage.')
    return
  }

  latestPages = pages
  latestMeta = {
    repoName: message.repoName || extractOwnerRepo(dom.repoUrl.value.trim()),
    elapsed: message.elapsed || '0.0'
  }

  await chrome.storage.local.set({
    repolens_pages: pages,
    repolens_meta: {
      repoName: latestMeta.repoName,
      elapsed: latestMeta.elapsed,
      generatedAt: new Date().toISOString()
    }
  })

  dom.resultsRepo.textContent = latestMeta.repoName
  dom.elapsedTime.textContent = `Generated in ${latestMeta.elapsed}s`
  setState(states.results)
}

function showError(code = 'UNKNOWN', fallbackMessage = '') {
  const mapped = errorMessages[code] || errorMessages.UNKNOWN
  dom.errorMessage.textContent = fallbackMessage || mapped
  setState(states.error)
}

function renderPageRows() {
  dom.pageRows.innerHTML = pageConfig.map(page => `
    <article class="page-row">
      <div>${page.icon}</div>
      <div>
        <div class="name">${escapeHtml(page.label)}</div>
        <div class="audience">${escapeHtml(page.audience)}</div>
      </div>
      <button class="open-btn" data-page="${page.key}" type="button">Open ↗</button>
    </article>
  `).join('')

  dom.pageRows.querySelectorAll('.open-btn').forEach(button => {
    button.addEventListener('click', () => openPage(button.getAttribute('data-page')))
  })
}

function openPage(page) {
  if (!latestPages) {
    chrome.storage.local.get(['repolens_pages']).then(data => {
      if (data.repolens_pages) {
        latestPages = data.repolens_pages
      }
      if (!latestPages) {
        showError('UNKNOWN', 'No generated pages found yet.')
        return
      }
      chrome.tabs.create({
        url: `${chrome.runtime.getURL('viewer.html')}?page=${encodeURIComponent(page)}`
      })
    })
    return
  }

  chrome.tabs.create({
    url: `${chrome.runtime.getURL('viewer.html')}?page=${encodeURIComponent(page)}`
  })
}

async function downloadZip() {
  if (!latestPages) {
    const data = await chrome.storage.local.get(['repolens_pages'])
    latestPages = data.repolens_pages
  }
  if (!latestPages) {
    showError('UNKNOWN', 'No generated pages are available for download.')
    return
  }
  if (!window.JSZip) {
    showError('UNKNOWN', 'JSZip failed to load.')
    return
  }

  const zip = new JSZip()
  zip.file('index.html', latestPages.index || '')
  zip.file('engineering.html', latestPages.engineering || '')
  zip.file('product.html', latestPages.product || '')
  zip.file('capability.html', latestPages.capability || '')
  zip.file('executive.html', latestPages.executive || '')

  const blob = await zip.generateAsync({ type: 'blob' })
  const fileName = `${(latestMeta?.repoName || 'repolens-pages').replace(/[^\w.-]+/g, '_')}.zip`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function extractOwnerRepo(url) {
  const match = String(url || '').match(/github\.com\/([^\/]+\/[^\/\s?#]+)/i)
  return match ? match[1].replace(/\/$/, '') : 'owner/repo'
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
