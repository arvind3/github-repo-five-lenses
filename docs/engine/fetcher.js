async function fetchRepoData(repoUrl) {
  const { owner, repo } = parseGitHubUrl(repoUrl)
  const base = 'https://api.github.com'
  const headers = { Accept: 'application/vnd.github+json' }

  let metaRes
  let readmeRes
  let treeRes
  let releasesRes
  let contributorsRes
  let languagesRes

  try {
    [metaRes, readmeRes, treeRes, releasesRes, contributorsRes, languagesRes] = await Promise.all([
      fetch(`${base}/repos/${owner}/${repo}`, { headers }),
      fetch(`${base}/repos/${owner}/${repo}/readme`, { headers }),
      fetch(`${base}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers }),
      fetch(`${base}/repos/${owner}/${repo}/releases?per_page=10`, { headers }),
      fetch(`${base}/repos/${owner}/${repo}/contributors?per_page=20`, { headers }),
      fetch(`${base}/repos/${owner}/${repo}/languages`, { headers })
    ])
  } catch (_err) {
    const err = new Error('Connection failed. Check your internet connection.')
    err.code = 'NETWORK_ERROR'
    throw err
  }

  if (metaRes.status === 404) {
    const err = new Error('Repository not found. Make sure it is public and the URL is correct.')
    err.code = 'REPO_NOT_FOUND'
    throw err
  }

  if (metaRes.status === 403) {
    const err = new Error('GitHub rate limit reached. Please wait a few minutes and try again.')
    err.code = 'RATE_LIMIT'
    throw err
  }

  if (!metaRes.ok) {
    const err = new Error(`GitHub API error: ${metaRes.status}`)
    err.code = 'GITHUB_ERROR'
    throw err
  }

  const meta = await metaRes.json()
  const readme = await parseReadme(readmeRes)
  const fileTree = await parseTree(treeRes)
  const releases = releasesRes.ok ? await releasesRes.json() : []
  const contributors = contributorsRes.ok ? await contributorsRes.json() : []
  const languages = languagesRes.ok ? await languagesRes.json() : {}
  const configContents = await fetchConfigContents(base, headers, owner, repo, fileTree)

  return {
    owner,
    repo,
    meta,
    readme,
    fileTree,
    releases,
    contributors,
    languages,
    configContents
  }
}

async function parseReadme(readmeRes) {
  if (!readmeRes.ok) return ''
  try {
    const readmeData = await readmeRes.json()
    const decoded = decodeBase64(readmeData.content || '')
    return decoded.length > 12000 ? `${decoded.slice(0, 12000)}\n...[truncated]` : decoded
  } catch (_err) {
    return ''
  }
}

async function parseTree(treeRes) {
  if (!treeRes.ok) return []
  try {
    const treeData = await treeRes.json()
    const nodes = Array.isArray(treeData.tree) ? treeData.tree : []
    return nodes
      .filter(node => typeof node.path === 'string')
      .filter(node => !node.path.startsWith('.git'))
      .slice(0, 3000)
      .map(node => ({ path: node.path, type: node.type || 'blob' }))
  } catch (_err) {
    return []
  }
}

async function fetchConfigContents(base, headers, owner, repo, fileTree) {
  const configFiles = new Set([
    'package.json',
    'requirements.txt',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'docker-compose.yml',
    'Dockerfile',
    '.env.example',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'architecture.md',
    'README.md'
  ])

  const candidates = fileTree
    .filter(entry => entry.type === 'blob')
    .map(entry => entry.path)
    .filter(path => configFiles.has(path))

  const configContents = {}
  await Promise.all(
    candidates.map(async path => {
      const res = await fetch(`${base}/repos/${owner}/${repo}/contents/${encodeURI(path)}`, { headers })
      if (!res.ok) return
      try {
        const data = await res.json()
        const decoded = decodeBase64(data.content || '')
        configContents[path] = decoded.length > 5000 ? `${decoded.slice(0, 5000)}\n...[truncated]` : decoded
      } catch (_err) {
      }
    })
  )
  return configContents
}

function decodeBase64(content) {
  const normalized = String(content || '').replace(/\n/g, '')
  const raw = atob(normalized)
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0))
  try {
    return new TextDecoder('utf-8').decode(bytes)
  } catch (_err) {
    return raw
  }
}

function parseGitHubUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim())
    if (parsed.hostname !== 'github.com') {
      const err = new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo')
      err.code = 'INVALID_URL'
      throw err
    }
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) {
      const err = new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo')
      err.code = 'INVALID_URL'
      throw err
    }

    const owner = parts[0]
    const repo = parts[1].replace(/\.git$/, '')
    if (!owner || !repo) {
      const err = new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo')
      err.code = 'INVALID_URL'
      throw err
    }
    return { owner, repo }
  } catch (error) {
    if (error?.code) throw error
    const err = new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo')
    err.code = 'INVALID_URL'
    throw err
  }
}
