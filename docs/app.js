const ERROR_MESSAGES = {
  INVALID_URL: 'Please enter a valid GitHub URL: https://github.com/owner/repo',
  REPO_NOT_FOUND: "Repository not found. Make sure it's public and the URL is correct.",
  RATE_LIMIT: 'GitHub rate limit reached (60 req/hr). Wait a few minutes and try again.',
  GITHUB_ERROR: 'GitHub API error. Please try again.',
  NETWORK_ERROR: 'Connection failed. Check your internet connection.',
  UNKNOWN: 'Something went wrong. Please try again.'
}

const PAGE_CONFIG = [
  { key: 'index', icon: 'H', label: 'Hub Page', audience: 'All visitors' },
  { key: 'engineering', icon: 'E', label: 'Engineering', audience: 'Developers' },
  { key: 'product', icon: 'P', label: 'Product', audience: 'End users' },
  { key: 'capability', icon: 'C', label: 'Capability', audience: 'Business strategy' },
  { key: 'executive', icon: 'X', label: 'Executive', audience: 'Leadership' }
]

const STORAGE_KEYS = {
  pages: 'repolens_web_pages',
  meta: 'repolens_web_meta'
}

const state = {
  pages: null,
  meta: null,
  activePage: 'index',
  generating: false
}

const els = {
  repoUrl: document.getElementById('repoUrl'),
  urlError: document.getElementById('urlError'),
  toggleContext: document.getElementById('toggleContext'),
  contextPanel: document.getElementById('contextPanel'),
  industry: document.getElementById('industry'),
  useCases: document.getElementById('useCases'),
  metrics: document.getElementById('metrics'),
  generateBtn: document.getElementById('generateBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressPanel: document.getElementById('progressPanel'),
  progressRepo: document.getElementById('progressRepo'),
  errorPanel: document.getElementById('errorPanel'),
  errorMessage: document.getElementById('errorMessage'),
  resultsPanel: document.getElementById('resultsPanel'),
  resultsMeta: document.getElementById('resultsMeta'),
  pageRows: document.getElementById('pageRows'),
  previewPanel: document.getElementById('previewPanel'),
  previewTabs: document.getElementById('previewTabs'),
  previewLabel: document.getElementById('previewLabel'),
  previewFrame: document.getElementById('previewFrame'),
  downloadCurrentBtn: document.getElementById('downloadCurrentBtn'),
  downloadAllBtn: document.getElementById('downloadAllBtn')
}

initialize()

function initialize() {
  els.toggleContext.addEventListener('click', handleToggleContext)
  els.repoUrl.addEventListener('blur', validateUrl)
  els.generateBtn.addEventListener('click', handleGenerate)
  els.resetBtn.addEventListener('click', resetUi)
  els.downloadCurrentBtn.addEventListener('click', downloadCurrentPage)
  els.downloadAllBtn.addEventListener('click', downloadAllPages)

  loadFromStorage()
}

function handleToggleContext() {
  const isHidden = els.contextPanel.classList.toggle('hidden')
  els.toggleContext.textContent = isHidden ? '+ Add Context' : '- Hide Context'
}

function validateUrl() {
  const value = String(els.repoUrl.value || '').trim()
  const valid = isValidGitHubUrl(value)
  els.repoUrl.classList.toggle('invalid', !valid && value.length > 0)
  els.urlError.classList.toggle('hidden', valid || value.length === 0)
  els.urlError.textContent = valid ? '' : ERROR_MESSAGES.INVALID_URL
  return valid
}

function isValidGitHubUrl(url) {
  const pattern = /^https:\/\/github\.com\/[^/\s]+\/[^/\s?#]+\/?$/i
  return pattern.test(String(url || '').trim())
}

async function handleGenerate() {
  if (state.generating) return
  if (!validateUrl()) return

  state.generating = true
  els.generateBtn.disabled = true
  hideError()
  showProgress()
  resetSteps()

  const repoUrl = els.repoUrl.value.trim()
  els.progressRepo.textContent = `analyzing: ${extractOwnerRepo(repoUrl)}`
  const startTime = Date.now()

  try {
    updateStep(1, 'loading', 'loading')
    const rawData = await fetchRepoData(repoUrl)
    updateStep(1, 'done', 'metadata loaded')

    updateStep(2, 'loading', 'loading')
    updateStep(2, 'done', 'structure analyzed')

    updateStep(3, 'loading', 'loading')
    const analysis = analyzeRepo(rawData, {
      industry: els.industry.value.trim(),
      useCases: els.useCases.value.trim(),
      metrics: els.metrics.value.trim()
    })
    updateStep(3, 'done', 'analysis complete')

    updateStep(4, 'loading', 'loading')
    const pages = generateAllPages(analysis)
    updateStep(4, 'done', 'pages ready')

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    state.pages = pages
    state.meta = {
      repoName: analysis.meta.fullName,
      generatedAt: new Date().toISOString(),
      elapsed
    }
    state.activePage = state.activePage && pages[state.activePage] ? state.activePage : 'index'

    persistToStorage()
    renderResults()
    renderPreview()
  } catch (error) {
    const code = error && error.code ? error.code : 'UNKNOWN'
    const message = ERROR_MESSAGES[code] || error.message || ERROR_MESSAGES.UNKNOWN
    showError(message)
  } finally {
    state.generating = false
    els.generateBtn.disabled = false
  }
}

function showProgress() {
  els.progressPanel.classList.remove('hidden')
  els.resultsPanel.classList.add('hidden')
  els.previewPanel.classList.add('hidden')
}

function resetSteps() {
  document.querySelectorAll('.progress-list li').forEach((item) => {
    item.classList.remove('done')
    const status = item.querySelector('.status')
    status.textContent = 'pending'
  })
}

function updateStep(step, status, label) {
  const row = document.querySelector(`.progress-list li[data-step="${step}"]`)
  if (!row) return
  const statusNode = row.querySelector('.status')
  if (status === 'done') {
    row.classList.add('done')
  }
  statusNode.textContent = label
}

function hideError() {
  els.errorPanel.classList.add('hidden')
  els.errorMessage.textContent = ''
}

function showError(message) {
  els.errorPanel.classList.remove('hidden')
  els.errorMessage.textContent = message
}

function renderResults() {
  if (!state.pages || !state.meta) return
  els.resultsPanel.classList.remove('hidden')
  els.resultsMeta.textContent = `${state.meta.repoName} | Generated in ${state.meta.elapsed}s`
  els.pageRows.innerHTML = PAGE_CONFIG.map((page) => {
    return `
      <article class="row">
        <div class="mono">${page.icon}</div>
        <div>
          <strong>${escapeHtml(page.label)}</strong>
          <small>${escapeHtml(page.audience)}</small>
        </div>
        <button class="row-btn" type="button" data-action="preview" data-page="${page.key}">Preview</button>
        <button class="row-btn" type="button" data-action="open" data-page="${page.key}">Open</button>
      </article>
    `
  }).join('')

  els.pageRows.querySelectorAll('button[data-action="preview"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activePage = button.getAttribute('data-page')
      renderPreview()
    })
  })

  els.pageRows.querySelectorAll('button[data-action="open"]').forEach((button) => {
    button.addEventListener('click', () => {
      const pageKey = button.getAttribute('data-page')
      openGeneratedPage(pageKey)
    })
  })
}

function renderPreview() {
  if (!state.pages) return
  if (!state.pages[state.activePage]) state.activePage = 'index'
  els.previewPanel.classList.remove('hidden')
  els.previewLabel.textContent = PAGE_CONFIG.find((page) => page.key === state.activePage).label

  els.previewTabs.innerHTML = PAGE_CONFIG.map((page) => `
    <button class="tab ${page.key === state.activePage ? 'active' : ''}" type="button" data-page="${page.key}">${page.label}</button>
  `).join('')

  els.previewTabs.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.activePage = tab.getAttribute('data-page')
      renderPreview()
    })
  })

  els.previewFrame.srcdoc = state.pages[state.activePage]
}

function openGeneratedPage(pageKey) {
  if (!state.pages || !state.pages[pageKey]) return
  const blob = new Blob([state.pages[pageKey]], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

function downloadCurrentPage() {
  if (!state.pages || !state.pages[state.activePage]) return
  const html = state.pages[state.activePage]
  const repoSafe = state.meta ? state.meta.repoName.replace(/[^\w.-]+/g, '_') : 'repolens'
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${repoSafe}_${state.activePage}.html`)
}

async function downloadAllPages() {
  if (!state.pages || !window.JSZip) {
    showError('ZIP generation unavailable. Please refresh and try again.')
    return
  }

  const zip = new JSZip()
  zip.file('index.html', state.pages.index || '')
  zip.file('engineering.html', state.pages.engineering || '')
  zip.file('product.html', state.pages.product || '')
  zip.file('capability.html', state.pages.capability || '')
  zip.file('executive.html', state.pages.executive || '')

  const blob = await zip.generateAsync({ type: 'blob' })
  const repoSafe = state.meta ? state.meta.repoName.replace(/[^\w.-]+/g, '_') : 'repolens'
  downloadBlob(blob, `${repoSafe}_repolens_pages.zip`)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function persistToStorage() {
  localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(state.pages))
  localStorage.setItem(STORAGE_KEYS.meta, JSON.stringify(state.meta))
}

function loadFromStorage() {
  try {
    const pagesRaw = localStorage.getItem(STORAGE_KEYS.pages)
    const metaRaw = localStorage.getItem(STORAGE_KEYS.meta)
    if (!pagesRaw || !metaRaw) return
    state.pages = JSON.parse(pagesRaw)
    state.meta = JSON.parse(metaRaw)
    renderResults()
    renderPreview()
    els.progressPanel.classList.add('hidden')
  } catch (_error) {
  }
}

function resetUi() {
  state.pages = null
  state.meta = null
  state.activePage = 'index'
  state.generating = false
  els.generateBtn.disabled = false
  els.repoUrl.value = ''
  els.urlError.textContent = ''
  els.urlError.classList.add('hidden')
  els.repoUrl.classList.remove('invalid')
  els.resultsPanel.classList.add('hidden')
  els.previewPanel.classList.add('hidden')
  els.progressPanel.classList.add('hidden')
  hideError()
  resetSteps()
  localStorage.removeItem(STORAGE_KEYS.pages)
  localStorage.removeItem(STORAGE_KEYS.meta)
}

function extractOwnerRepo(url) {
  const match = String(url || '').match(/github\.com\/([^/\s]+\/[^/\s?#]+)/i)
  return match ? match[1].replace(/\/$/, '') : 'owner/repo'
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
