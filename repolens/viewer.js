const pageMap = [
  { key: 'index', label: 'Hub' },
  { key: 'engineering', label: 'Engineering' },
  { key: 'product', label: 'Product' },
  { key: 'capability', label: 'Capability' },
  { key: 'executive', label: 'Executive' }
]

const dom = {
  backBtn: document.getElementById('backBtn'),
  title: document.getElementById('title'),
  downloadBtn: document.getElementById('downloadBtn'),
  pills: document.getElementById('pills'),
  frame: document.getElementById('pageFrame'),
  empty: document.getElementById('emptyState')
}

let pages = null
let meta = null
let currentPage = 'index'

init()

async function init() {
  bindEvents()

  const params = new URLSearchParams(window.location.search)
  currentPage = normalizePage(params.get('page'))

  const data = await chrome.storage.local.get(['repolens_pages', 'repolens_meta'])
  pages = data.repolens_pages || null
  meta = data.repolens_meta || { repoName: 'owner/repo' }

  renderPills()
  renderCurrentPage()
}

function bindEvents() {
  dom.backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.close()
    }
  })
  dom.downloadBtn.addEventListener('click', () => downloadCurrentPage())
}

function renderPills() {
  dom.pills.innerHTML = pageMap.map(page => `
    <button class="pill ${page.key === currentPage ? 'active' : ''}" data-page="${page.key}" type="button">${page.label}</button>
  `).join('')

  dom.pills.querySelectorAll('.pill').forEach(button => {
    button.addEventListener('click', () => {
      currentPage = normalizePage(button.getAttribute('data-page'))
      updateUrl()
      renderPills()
      renderCurrentPage()
    })
  })
}

function renderCurrentPage() {
  const label = pageMap.find(page => page.key === currentPage)?.label || 'Hub'
  const repo = meta?.repoName || 'owner/repo'
  dom.title.textContent = `${label} | ${repo}`

  if (!pages || !pages[currentPage]) {
    dom.frame.classList.add('hidden')
    dom.empty.classList.remove('hidden')
    return
  }

  dom.empty.classList.add('hidden')
  dom.frame.classList.remove('hidden')
  dom.frame.srcdoc = pages[currentPage]
}

function updateUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('page', currentPage)
  history.replaceState({}, '', url.toString())
}

function normalizePage(page) {
  const value = String(page || '').toLowerCase()
  return pageMap.find(item => item.key === value)?.key || 'index'
}

function downloadCurrentPage() {
  if (!pages || !pages[currentPage]) return
  const blob = new Blob([pages[currentPage]], { type: 'text/html;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = `${currentPage}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}
