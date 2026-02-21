function analyzeRepo(rawData, userContext = {}) {
  const {
    meta,
    readme,
    fileTree,
    releases,
    contributors,
    languages,
    configContents,
    owner,
    repo
  } = rawData

  return {
    meta: extractMeta(meta, owner, repo),
    techStack: extractTechStack(languages, configContents, fileTree, readme),
    architecture: extractArchitecture(fileTree, configContents, readme),
    features: extractFeatures(readme, meta),
    useCases: extractUseCases(readme, meta, userContext),
    personas: inferPersonas(readme, meta, userContext),
    metrics: extractMetrics(meta, releases, contributors, userContext),
    narrative: buildNarrative(meta, readme, userContext),
    domains: inferDomains(meta, readme, userContext),
    maturity: assessMaturity(meta, releases, contributors, fileTree),
    gettingStarted: extractGettingStarted(readme, configContents),
    designDecisions: extractDesignDecisions(readme, configContents),
    context: normalizeContext(userContext)
  }
}

function extractMeta(meta, owner, repo) {
  return {
    name: meta?.name || repo,
    fullName: meta?.full_name || `${owner}/${repo}`,
    owner,
    repo,
    description: meta?.description || inferDescription(meta, owner, repo),
    stars: Number(meta?.stargazers_count || 0),
    forks: Number(meta?.forks_count || 0),
    watchers: Number(meta?.watchers_count || 0),
    openIssues: Number(meta?.open_issues_count || 0),
    primaryLanguage: meta?.language || '',
    topics: Array.isArray(meta?.topics) ? meta.topics : [],
    license: meta?.license?.name || 'Not specified',
    homepage: meta?.homepage || '',
    createdAt: meta?.created_at || '',
    updatedAt: meta?.updated_at || '',
    repoUrl: meta?.html_url || `https://github.com/${owner}/${repo}`,
    isArchived: Boolean(meta?.archived),
    defaultBranch: meta?.default_branch || 'main'
  }
}

function extractTechStack(languages, configContents, fileTree, readme) {
  const stack = []
  const totalBytes = Object.values(languages || {}).reduce((sum, value) => sum + value, 0)

  Object.entries(languages || {})
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, bytes]) => {
      const pct = totalBytes ? Math.round((bytes / totalBytes) * 100) : 0
      stack.push({ name, type: 'language', percentage: pct })
    })

  const packageJson = safeJson(configContents['package.json'])
  if (packageJson) {
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) }
    detectDeps(deps, {
      react: ['React', 'framework'],
      vue: ['Vue.js', 'framework'],
      next: ['Next.js', 'framework'],
      nuxt: ['Nuxt.js', 'framework'],
      express: ['Express.js', 'framework'],
      fastify: ['Fastify', 'framework'],
      svelte: ['Svelte', 'framework'],
      nest: ['NestJS', 'framework'],
      prisma: ['Prisma', 'database'],
      mongoose: ['MongoDB/Mongoose', 'database'],
      pg: ['PostgreSQL', 'database'],
      redis: ['Redis', 'database'],
      graphql: ['GraphQL', 'api'],
      jest: ['Jest', 'testing'],
      vitest: ['Vitest', 'testing'],
      playwright: ['Playwright', 'testing'],
      typescript: ['TypeScript', 'language'],
      tailwindcss: ['Tailwind CSS', 'styling']
    }, stack)
    if (packageJson.engines?.node) {
      stack.push({ name: `Node.js ${packageJson.engines.node}`, type: 'runtime' })
    }
  }

  const requirements = String(configContents['requirements.txt'] || '').toLowerCase()
  if (requirements) {
    const pyMap = {
      fastapi: ['FastAPI', 'framework'],
      flask: ['Flask', 'framework'],
      django: ['Django', 'framework'],
      sqlalchemy: ['SQLAlchemy', 'database'],
      celery: ['Celery', 'infrastructure'],
      pandas: ['Pandas', 'data'],
      numpy: ['NumPy', 'data'],
      torch: ['PyTorch', 'ai'],
      tensorflow: ['TensorFlow', 'ai'],
      transformers: ['Transformers', 'ai']
    }
    Object.keys(pyMap).forEach(dep => {
      if (requirements.includes(dep)) pushUnique(stack, { name: pyMap[dep][0], type: pyMap[dep][1] })
    })
  }

  const treePaths = (fileTree || []).map(entry => entry.path.toLowerCase())
  if (treePaths.some(path => path.includes('dockerfile') || path.includes('docker-compose'))) {
    pushUnique(stack, { name: 'Docker', type: 'infrastructure' })
  }
  if (treePaths.some(path => path.startsWith('.github/workflows/'))) {
    pushUnique(stack, { name: 'GitHub Actions', type: 'ci' })
  }
  if (treePaths.some(path => path.includes('terraform'))) {
    pushUnique(stack, { name: 'Terraform', type: 'infrastructure' })
  }

  const readmeLower = String(readme || '').toLowerCase()
  if (readmeLower.includes('kubernetes') || readmeLower.includes('k8s')) {
    pushUnique(stack, { name: 'Kubernetes', type: 'infrastructure' })
  }
  if (readmeLower.includes('postgres')) {
    pushUnique(stack, { name: 'PostgreSQL', type: 'database' })
  }

  return stack.slice(0, 24)
}

function detectDeps(dependencies, depMap, stack) {
  Object.keys(dependencies || {}).forEach(dep => {
    const normalized = dep.toLowerCase()
    Object.entries(depMap).forEach(([token, descriptor]) => {
      if (normalized.includes(token)) {
        pushUnique(stack, { name: descriptor[0], type: descriptor[1] })
      }
    })
  })
}

function extractArchitecture(fileTree, configContents, readme) {
  const paths = (fileTree || []).map(entry => entry.path.toLowerCase())
  const components = []
  const patterns = []

  if (paths.some(path => path.startsWith('src/') || path.startsWith('app/'))) {
    components.push({ name: 'Application Core', role: 'Primary business logic and runtime modules' })
  }
  if (paths.some(path => path.includes('api') || path.includes('routes') || path.includes('controller'))) {
    components.push({ name: 'API Layer', role: 'Exposes application capabilities to clients and integrations' })
  }
  if (paths.some(path => path.includes('web') || path.includes('frontend') || path.includes('ui') || path.includes('pages'))) {
    components.push({ name: 'Client Interface', role: 'User-facing experience and interaction workflows' })
  }
  if (paths.some(path => path.includes('db') || path.includes('model') || path.includes('migration'))) {
    components.push({ name: 'Data Layer', role: 'Persistence, schema evolution, and query operations' })
  }
  if (paths.some(path => path.includes('worker') || path.includes('queue') || path.includes('job'))) {
    components.push({ name: 'Background Processing', role: 'Async processing for workloads and automation tasks' })
  }
  if (paths.some(path => path.includes('test') || path.includes('spec'))) {
    components.push({ name: 'Quality Gate', role: 'Automated tests and behavior validation coverage' })
  }
  if (paths.some(path => path.includes('.github/workflows'))) {
    components.push({ name: 'CI Pipeline', role: 'Automated build, test, and release checks' })
  }
  if (paths.some(path => path.includes('docs') || path.endsWith('.md'))) {
    components.push({ name: 'Documentation', role: 'Developer onboarding and operational guidance' })
  }

  if (components.length <= 2) {
    components.push({ name: 'Core Modules', role: 'Main logic organized around focused feature modules' })
  }

  if (paths.some(path => path.includes('controller') && path.includes('service'))) {
    patterns.push('Layered service architecture')
  }
  if (paths.some(path => path.includes('packages/') || path.includes('apps/'))) {
    patterns.push('Monorepo partitioning')
  }
  if (paths.some(path => path.includes('cli') || path.includes('command'))) {
    patterns.push('Command-line orchestration')
  }
  if (paths.some(path => path.includes('event') || path.includes('queue') || path.includes('kafka'))) {
    patterns.push('Event-driven processing')
  }
  if (paths.some(path => path.includes('plugin') || path.includes('extension'))) {
    patterns.push('Extensible plugin architecture')
  }
  if (patterns.length === 0) {
    patterns.push('Modular project composition')
  }

  const deployment = []
  if (paths.includes('dockerfile') || paths.includes('docker-compose.yml')) deployment.push('Containerized deployment')
  if (paths.some(path => path.includes('.github/workflows'))) deployment.push('Automated CI/CD workflows')
  if (String(configContents['go.mod'] || '')) deployment.push('Go module packaging')
  if (String(configContents['Cargo.toml'] || '')) deployment.push('Rust cargo build chain')
  if (deployment.length === 0) deployment.push('Source-based deployment with environment configuration')

  return {
    components: components.slice(0, 7),
    patterns: patterns.slice(0, 4),
    deployment
  }
}

function extractFeatures(readme, meta) {
  const features = []
  const section = extractReadmeSection(readme, ['features', 'capabilities', 'what it does', 'highlights'])
  const bullets = extractBulletLines(section || readme)

  bullets.slice(0, 8).forEach(line => {
    const cleaned = cleanSentence(line)
    if (cleaned.length > 4) {
      features.push({
        name: toTitle(cleaned.slice(0, 48)),
        description: cleaned
      })
    }
  })

  if (features.length < 4) {
    const topicFeatures = (meta?.topics || []).slice(0, 6)
    topicFeatures.forEach(topic => {
      features.push({
        name: toTitle(topic.replace(/-/g, ' ')),
        description: `Supports ${topic.replace(/-/g, ' ')} workflows through focused project components.`
      })
    })
  }

  if (features.length === 0) {
    features.push(
      { name: 'Open Source Delivery', description: 'Designed for transparent collaboration and community contribution.' },
      { name: 'Configurable Workflows', description: 'Includes configuration patterns for real-world setup and customization.' },
      { name: 'Developer Friendly', description: 'Prioritizes practical setup and clear project structure for contributors.' },
      { name: 'Reusable Components', description: 'Core modules are structured to be adaptable across multiple use cases.' }
    )
  }

  return features.slice(0, 8)
}

function extractUseCases(readme, meta, userContext) {
  const useCases = []
  const contextCases = splitUserList(userContext.useCases)
  contextCases.forEach(item => useCases.push(item))

  const section = extractReadmeSection(readme, ['use case', 'who is this for', 'examples', 'scenarios'])
  extractBulletLines(section).slice(0, 6).forEach(line => useCases.push(cleanSentence(line)))

  const inferred = [
    `Accelerate ${meta?.language || 'software'} project delivery with reusable foundations.`,
    'Standardize team workflows with a documented, shareable implementation pattern.',
    'Use as a reference implementation for onboarding and architecture alignment.'
  ]
  inferred.forEach(item => useCases.push(item))

  return dedupe(useCases).filter(Boolean).slice(0, 6)
}

function inferPersonas(readme, meta, userContext) {
  const fromContext = splitUserList(userContext.personas).map(item => ({
    role: item,
    pain: `Needs a reliable way to execute ${meta?.name || 'the project'} outcomes quickly.`,
    benefit: 'Gets a structured, reusable implementation with less uncertainty.'
  }))

  const personas = [...fromContext]
  const text = `${readme || ''} ${(meta?.topics || []).join(' ')}`.toLowerCase()

  const candidates = [
    {
      role: 'Software Engineer',
      pain: 'Needs maintainable implementation details and fast onboarding.',
      benefit: 'Clear architecture and setup paths reduce delivery time.'
    },
    {
      role: 'Platform/DevOps Engineer',
      pain: 'Needs reliable deployment and automation coverage.',
      benefit: 'Tooling and workflow conventions improve operational consistency.'
    },
    {
      role: 'Product Builder',
      pain: 'Needs user-facing value with predictable development effort.',
      benefit: 'Feature-oriented components enable faster iteration.'
    },
    {
      role: 'Engineering Leader',
      pain: 'Needs confidence in maintainability and project momentum.',
      benefit: 'Metrics and release signals support governance and investment decisions.'
    }
  ]

  if (text.includes('data') || text.includes('ml') || text.includes('ai')) {
    candidates.unshift({
      role: 'Data/ML Engineer',
      pain: 'Needs production-ready patterns for data workflows.',
      benefit: 'Combines experimentation and delivery through practical project structure.'
    })
  }

  candidates.forEach(candidate => {
    if (!personas.find(existing => existing.role === candidate.role)) {
      personas.push(candidate)
    }
  })

  return personas.slice(0, 6)
}

function extractMetrics(meta, releases, contributors, userContext) {
  const now = Date.now()
  const lastUpdated = meta?.updated_at ? new Date(meta.updated_at).getTime() : now
  const daysSinceUpdate = Math.max(0, Math.round((now - lastUpdated) / (1000 * 60 * 60 * 24)))

  return {
    stars: Number(meta?.stargazers_count || 0),
    forks: Number(meta?.forks_count || 0),
    watchers: Number(meta?.subscribers_count || meta?.watchers_count || 0),
    openIssues: Number(meta?.open_issues_count || 0),
    contributors: Array.isArray(contributors) ? contributors.length : 0,
    releases: Array.isArray(releases) ? releases.length : 0,
    lastUpdated: meta?.updated_at || '',
    daysSinceUpdate,
    userProvided: {
      metrics: String(userContext.metrics || '').trim(),
      useCases: splitUserList(userContext.useCases),
      industry: String(userContext.industry || '').trim()
    }
  }
}

function buildNarrative(meta, readme, userContext) {
  const description = meta?.description || inferDescription(meta)
  const industry = String(userContext.industry || '').trim()
  const useCases = splitUserList(userContext.useCases)
  const lead = `${meta?.name || 'This project'} exists to solve a practical delivery problem with a maintainable, open-source approach.`
  const body = `${description}. It combines reusable technical foundations with documentation that helps teams move from setup to value quickly.`
  const tail = industry || useCases.length
    ? `The strongest fit is for ${industry || 'software teams'} focused on ${useCases[0] || 'faster, lower-risk execution'}.`
    : `Its strongest value is reducing implementation friction for teams shipping in iterative cycles.`

  return `${lead} ${body} ${tail}`
}

function inferDomains(meta, readme, userContext) {
  const domains = []
  const explicitIndustry = String(userContext.industry || '').trim()
  if (explicitIndustry) domains.push({ name: explicitIndustry, confidence: 'explicit' })

  const map = {
    healthcare: 'Healthcare & Life Sciences',
    finance: 'Financial Services',
    fintech: 'Financial Technology',
    education: 'Education & EdTech',
    devops: 'DevOps & Platform Engineering',
    security: 'Cybersecurity',
    ecommerce: 'E-commerce & Retail',
    retail: 'E-commerce & Retail',
    analytics: 'Data & Analytics',
    data: 'Data & Analytics',
    ml: 'Artificial Intelligence & ML',
    ai: 'Artificial Intelligence & ML',
    api: 'API & Integration',
    cli: 'Developer Tooling',
    cloud: 'Cloud Infrastructure',
    automation: 'Workflow Automation'
  }

  const text = `${(meta?.topics || []).join(' ')} ${meta?.description || ''} ${String(readme || '').slice(0, 3000)}`.toLowerCase()
  Object.entries(map).forEach(([token, domain]) => {
    if (text.includes(token) && !domains.find(item => item.name === domain)) {
      domains.push({ name: domain, confidence: 'inferred' })
    }
  })

  if (!domains.find(item => item.name === 'Software Engineering')) {
    domains.push({ name: 'Software Engineering', confidence: 'default' })
  }
  if (!domains.find(item => item.name === 'Developer Productivity')) {
    domains.push({ name: 'Developer Productivity', confidence: 'default' })
  }

  return domains.slice(0, 6)
}

function assessMaturity(meta, releases, contributors, fileTree) {
  let score = 0
  if ((meta?.stargazers_count || 0) > 100) score += 2
  if ((meta?.stargazers_count || 0) > 1000) score += 2
  if ((releases || []).length > 0) score += 2
  if ((releases || []).length > 5) score += 1
  if ((contributors || []).length > 3) score += 1
  if ((contributors || []).length > 10) score += 1

  const paths = (fileTree || []).map(entry => entry.path)
  if (paths.includes('CONTRIBUTING.md')) score += 1
  if (paths.some(path => /test|spec/i.test(path))) score += 1
  if (paths.some(path => path.startsWith('.github/workflows/'))) score += 1

  if (score >= 9) return { level: 'Production-Ready', badge: 'green', score }
  if (score >= 6) return { level: 'Active Development', badge: 'yellow', score }
  if (score >= 3) return { level: 'Early Stage', badge: 'orange', score }
  return { level: 'Experimental', badge: 'blue', score }
}

function extractGettingStarted(readme, configContents) {
  const section = extractReadmeSection(readme, ['getting started', 'installation', 'quick start', 'setup', 'install'])
  const commands = []
  const searchIn = section || String(readme || '').slice(0, 3500)
  const regex = /```(?:bash|sh|shell|zsh|powershell|cmd)?\n([\s\S]+?)```/gi
  let match
  while ((match = regex.exec(searchIn)) !== null) {
    const block = match[1].trim()
    if (block) commands.push(block)
    if (commands.length >= 4) break
  }

  if (!commands.length && configContents['package.json']) {
    commands.push('npm install\nnpm run build\nnpm start')
  }
  if (!commands.length && configContents['requirements.txt']) {
    commands.push('pip install -r requirements.txt\npython main.py')
  }
  if (!commands.length && configContents['go.mod']) {
    commands.push('go mod tidy\ngo run .')
  }
  if (!commands.length && configContents['Cargo.toml']) {
    commands.push('cargo build\ncargo run')
  }
  if (!commands.length) {
    commands.push('git clone <repo-url>\ncd <repo>\n# Follow project README setup steps')
  }

  const steps = section || 'Install dependencies, configure environment, then run the primary startup command from the repository README.'
  return { steps, commands }
}

function extractDesignDecisions(readme, configContents) {
  const decisions = []
  const section = extractReadmeSection(readme, ['design', 'rationale', 'why', 'philosophy', 'approach'])
  extractBulletLines(section).forEach(line => {
    const cleaned = cleanSentence(line)
    if (cleaned.length > 6) decisions.push(cleaned)
  })

  if (!decisions.length && configContents['package.json']) {
    const packageJson = safeJson(configContents['package.json'])
    if (packageJson?.type === 'module') decisions.push('Adopts ES modules for explicit imports and modern runtime compatibility.')
    if (packageJson?.scripts?.test) decisions.push('Defines test automation scripts to reduce release risk.')
  }

  return dedupe(decisions).slice(0, 6)
}

function extractReadmeSection(readme, keywords) {
  if (!readme) return ''
  const lines = readme.split('\n')
  let capture = false
  let depth = 0
  const output = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const header = line.match(/^(#{1,3})\s+(.+)/)
    if (header) {
      const currentDepth = header[1].length
      const label = header[2].toLowerCase()
      if (keywords.some(keyword => label.includes(keyword))) {
        capture = true
        depth = currentDepth
        continue
      }
      if (capture && currentDepth <= depth) break
    }
    if (capture) {
      output.push(line)
      if (output.length > 80) break
    }
  }

  return output.join('\n').trim()
}

function extractBulletLines(text) {
  return String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^[-*+]\s+/.test(line))
    .map(line => line.replace(/^[-*+]\s+/, '').trim())
}

function normalizeContext(userContext) {
  return {
    industry: String(userContext.industry || '').trim(),
    useCases: String(userContext.useCases || '').trim(),
    metrics: String(userContext.metrics || '').trim(),
    personas: String(userContext.personas || '').trim()
  }
}

function splitUserList(value) {
  return String(value || '')
    .split(/\r?\n|,|;/)
    .map(item => item.trim())
    .filter(Boolean)
}

function safeJson(input) {
  try {
    return JSON.parse(input)
  } catch (_err) {
    return null
  }
}

function dedupe(items) {
  return [...new Set(items.map(item => String(item || '').trim()))]
}

function cleanSentence(text) {
  return String(text || '')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTitle(text) {
  return String(text || '')
    .split(' ')
    .map(word => word ? `${word[0].toUpperCase()}${word.slice(1)}` : '')
    .join(' ')
    .trim()
}

function inferDescription(meta, owner = 'community', repo = 'project') {
  if (meta?.description) return meta.description
  const name = meta?.name || repo
  return `${name} is an open-source project maintained by ${owner}.`
}

function pushUnique(list, entry) {
  if (!list.find(item => item.name === entry.name)) list.push(entry)
}
