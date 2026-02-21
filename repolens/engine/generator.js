function generateAllPages(analysis) {
  return {
    index: generateHubPage(analysis),
    engineering: generateEngineeringPage(analysis),
    product: generateProductPage(analysis),
    capability: generateCapabilityPage(analysis),
    executive: generateExecutivePage(analysis)
  }
}

function generateHubPage(analysis) {
  const meta = analysis.meta
  const maturity = analysis.maturity

  const hero = `
    <section class="hero hero-gradient">
      <div>
        <p class="eyebrow">Hub Perspective</p>
        <h1>${escapeHtml(meta.fullName)}</h1>
        <p class="lead">${escapeHtml(meta.description)}</p>
      </div>
      <div class="badge badge-${escapeHtml(maturity.badge)}">${escapeHtml(maturity.level)}</div>
    </section>
  `

  const stats = [
    ['Stars', formatNumber(meta.stars)],
    ['Forks', formatNumber(meta.forks)],
    ['Contributors', formatNumber(analysis.metrics.contributors)],
    ['Releases', formatNumber(analysis.metrics.releases)]
  ]

  const cards = [
    ['engineering', 'Engineering', 'Developers', 'Architecture, stack, and implementation depth.'],
    ['product', 'Product', 'End Users', 'Value proposition, features, and user outcomes.'],
    ['capability', 'Capability', 'Business Strategy', 'Cross-domain leverage and platform potential.'],
    ['executive', 'Executive', 'Leadership', 'Strategic summary and evidence snapshot.']
  ]

  const body = `
    <section class="stats-grid">
      ${stats.map(([label, value]) => `
        <article class="card stat-card">
          <p class="mono muted">${escapeHtml(label)}</p>
          <h2>${escapeHtml(value)}</h2>
        </article>
      `).join('')}
    </section>

    <section class="split-grid">
      ${cards.map(([key, title, audience, desc]) => `
        <article class="card perspective-card audience-${key}">
          <p class="mono muted">${escapeHtml(audience)}</p>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(desc)}</p>
          <a class="ghost-btn" href="./${key}.html">Open -></a>
        </article>
      `).join('')}
    </section>

    <section class="card">
      <h3>Tech Stack</h3>
      <div class="chip-row">
        ${analysis.techStack.slice(0, 14).map(item => `<span class="chip">${escapeHtml(item.name)}</span>`).join('')}
      </div>
    </section>

    <section class="card">
      <h3>Topics</h3>
      <div class="chip-row">
        ${meta.topics.length ? meta.topics.map(topic => `<span class="chip subtle">${escapeHtml(topic)}</span>`).join('') : '<span class="muted">No topics published for this repository.</span>'}
      </div>
      <div class="section-actions">
        <a class="primary-btn" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">View on GitHub</a>
      </div>
    </section>
  `

  return renderPage({ analysis, pageKey: 'index', pageName: 'Hub', hero, body })
}

function generateEngineeringPage(analysis) {
  const meta = analysis.meta
  const arch = analysis.architecture
  const commands = analysis.gettingStarted.commands || []
  const stackGroups = groupBy(analysis.techStack, 'type')

  const hero = `
    <section class="hero">
      <p class="eyebrow">Engineering Perspective</p>
      <h1>${escapeHtml(meta.name)} Technical Thesis</h1>
      <p class="lead">${escapeHtml(buildTechnicalThesis(analysis))}</p>
      <p class="mono muted">Patterns: ${escapeHtml(arch.patterns.join(' | '))}</p>
    </section>
  `

  const body = `
    <section class="card">
      <h3>Architecture Visualization</h3>
      <div class="arch-map">
        ${arch.components.slice(0, 6).map(component => `
          <div class="arch-node">
            <h4>${escapeHtml(component.name)}</h4>
            <p>${escapeHtml(component.role)}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="card">
      <h3>Tech Stack by Layer</h3>
      <div class="stack-groups">
        ${Object.entries(stackGroups).map(([type, items]) => `
          <article class="stack-column">
            <h4>${escapeHtml(toTitleCase(type))}</h4>
            ${items.map(item => `<p class="mono">${escapeHtml(item.name)}${item.percentage ? ` <span class="muted">(${item.percentage}%)</span>` : ''}</p>`).join('')}
          </article>
        `).join('')}
      </div>
    </section>

    <section class="card">
      <h3>How It Works</h3>
      <ol class="steps">
        ${deriveHowItWorks(analysis).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
    </section>

    <section class="card">
      <h3>Install and Run</h3>
      ${commands.map((cmd, i) => `
        <div class="code-wrap">
          <button class="ghost-btn copy-btn" data-copy-id="cmd-${i}">Copy</button>
          <pre><code id="cmd-${i}">${escapeHtml(cmd)}</code></pre>
        </div>
      `).join('')}
    </section>

    <section class="card">
      <h3>Design Decisions</h3>
      ${(analysis.designDecisions || []).length ? analysis.designDecisions.map(decision => `
        <details class="decision">
          <summary>${escapeHtml(shortSummary(decision))}</summary>
          <p>${escapeHtml(decision)}</p>
        </details>
      `).join('') : '<p class="muted">No explicit design rationale was detected in the repository docs.</p>'}
    </section>

    <section class="card metric-strip">
      <article><p class="muted mono">Maturity</p><h4>${escapeHtml(analysis.maturity.level)}</h4></article>
      <article><p class="muted mono">Open Issues</p><h4>${escapeHtml(String(meta.openIssues))}</h4></article>
      <article><p class="muted mono">Updated</p><h4>${escapeHtml(formatDate(meta.updatedAt))}</h4></article>
      <article><p class="muted mono">Contributors</p><h4>${escapeHtml(String(analysis.metrics.contributors))}</h4></article>
    </section>

    <section class="section-actions">
      <a class="primary-btn" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">Open Repository</a>
    </section>
  `

  const extraScript = `
    document.querySelectorAll('.copy-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-copy-id')
        const node = document.getElementById(id)
        if (!node) return
        try {
          await navigator.clipboard.writeText(node.textContent || '')
          const prev = button.textContent
          button.textContent = 'Copied'
          setTimeout(() => button.textContent = prev, 1200)
        } catch (_err) {
          button.textContent = 'Copy failed'
          setTimeout(() => button.textContent = 'Copy', 1200)
        }
      })
    })
  `

  return renderPage({ analysis, pageKey: 'engineering', pageName: 'Engineering', hero, body, extraScript })
}

function generateProductPage(analysis) {
  const meta = analysis.meta

  const hero = `
    <section class="hero">
      <p class="eyebrow">Product Perspective</p>
      <h1>${escapeHtml(meta.name)} as User Value</h1>
      <p class="lead">${escapeHtml(productValueLine(analysis))}</p>
    </section>
  `

  const body = `
    <section class="card">
      <h3>Problem</h3>
      <p>${escapeHtml(problemNarrative(analysis))}</p>
    </section>

    <section class="card">
      <h3>Solution</h3>
      <p>${escapeHtml(solutionNarrative(analysis))}</p>
    </section>

    <section class="card">
      <h3>User Journey</h3>
      <div class="journey">
        <div class="journey-step"><span>1</span><p>Discover</p></div><div class="journey-link">-></div>
        <div class="journey-step"><span>2</span><p>Install</p></div><div class="journey-link">-></div>
        <div class="journey-step"><span>3</span><p>Configure</p></div><div class="journey-link">-></div>
        <div class="journey-step"><span>4</span><p>Value</p></div>
      </div>
    </section>

    <section class="split-grid">
      ${analysis.features.slice(0, 8).map((feature, index) => `
        <article class="card feature-card">
          <h4>${featureEmoji(index)} ${escapeHtml(feature.name)}</h4>
          <p>${escapeHtml(feature.description)}</p>
        </article>
      `).join('')}
    </section>

    <section class="split-grid">
      ${analysis.personas.slice(0, 6).map(persona => `
        <article class="card">
          <h4>${escapeHtml(persona.role)}</h4>
          <p><strong>Pain:</strong> ${escapeHtml(persona.pain)}</p>
          <p><strong>Benefit:</strong> ${escapeHtml(persona.benefit)}</p>
        </article>
      `).join('')}
    </section>

    <section class="card">
      <h3>Before / After</h3>
      <table class="compare">
        <thead><tr><th>Before</th><th>After</th></tr></thead>
        <tbody>
          <tr><td>Fragmented implementation patterns</td><td>Reusable structured workflow with clear entry points</td></tr>
          <tr><td>Slow team onboarding</td><td>Faster adoption through documented setup and examples</td></tr>
          <tr><td>Inconsistent quality baseline</td><td>Predictable process anchored in tested project components</td></tr>
        </tbody>
      </table>
    </section>

    <section class="card">
      <h3>Use Cases</h3>
      <ul class="plain-list">${analysis.useCases.slice(0, 6).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <div class="chip-row">${meta.topics.map(topic => `<span class="chip subtle">${escapeHtml(topic)}</span>`).join('')}</div>
      <div class="section-actions">
        <a class="primary-btn" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">Explore on GitHub</a>
      </div>
    </section>
  `

  return renderPage({ analysis, pageKey: 'product', pageName: 'Product', hero, body })
}

function generateCapabilityPage(analysis) {
  const meta = analysis.meta
  const domains = analysis.domains.slice(0, 6)

  const hero = `
    <section class="hero">
      <p class="eyebrow">Capability Perspective</p>
      <h1>Not just ${escapeHtml(meta.name)}. A platform for reusable capability.</h1>
      <p class="lead">${escapeHtml(capabilityThesis(analysis))}</p>
    </section>
  `

  const body = `
    <section class="card">
      <h3>Capability Map</h3>
      <div class="radial-wrap">${buildDomainRadial(meta.name, domains)}</div>
    </section>

    <section class="split-grid">
      ${domains.map(domain => `
        <article class="card">
          <h4>${escapeHtml(domain.name)}</h4>
          <p><strong>Problem:</strong> Teams need dependable execution patterns under delivery pressure.</p>
          <p><strong>Fit:</strong> ${escapeHtml(meta.name)} contributes modular building blocks and implementation guidance.</p>
          <p><strong>Impact:</strong> Faster time-to-value with lower architecture rework.</p>
        </article>
      `).join('')}
    </section>

    <section class="card">
      <h3>Building Blocks</h3>
      <div class="chip-row">
        ${analysis.techStack.slice(0, 16).map(item => `<span class="chip">${escapeHtml(item.name)}</span>`).join('')}
      </div>
    </section>

    <section class="card">
      <h3>Combination Plays</h3>
      <ul class="plain-list">${combinationPlays(analysis).map(play => `<li>${escapeHtml(play)}</li>`).join('')}</ul>
    </section>

    <section class="card">
      <h3>Emerging Opportunity</h3>
      <p>${escapeHtml(emergingOpportunity(analysis))}</p>
      <div class="section-actions">
        <a class="primary-btn" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">Connect with the Maintainer</a>
      </div>
    </section>
  `

  return renderPage({ analysis, pageKey: 'capability', pageName: 'Capability', hero, body })
}

function generateExecutivePage(analysis) {
  const meta = analysis.meta
  const metrics = analysis.metrics

  const hero = `
    <section class="hero hero-minimal">
      <p class="eyebrow">Executive Perspective</p>
      <h1>${escapeHtml(executiveStatement(analysis))}</h1>
    </section>
  `

  const body = `
    <section class="card"><h3>The Opportunity</h3><p>${escapeHtml(executiveOpportunity(analysis))}</p></section>

    <section class="card">
      <h3>What We Built</h3>
      <p>${escapeHtml(meta.name)} serves teams that need ${escapeHtml(primaryAudience(analysis))}. It combines ${escapeHtml(primaryCapabilities(analysis))}. The result is a reusable asset for faster, lower-risk delivery.</p>
    </section>

    <section class="metric-strip">
      <article class="card"><p class="mono muted">Stars</p><h3>${formatNumber(metrics.stars)}</h3></article>
      <article class="card"><p class="mono muted">Contributors</p><h3>${formatNumber(metrics.contributors)}</h3></article>
      <article class="card"><p class="mono muted">Releases</p><h3>${formatNumber(metrics.releases)}</h3></article>
      <article class="card"><p class="mono muted">Last Updated</p><h3>${escapeHtml(formatDate(metrics.lastUpdated))}</h3></article>
    </section>

    <section class="card">
      <h3>Strategic Value</h3>
      <ul class="plain-list">
        <li>Defensibility: proven public footprint and contributor participation.</li>
        <li>Extensibility: modular stack components support adjacent scenarios.</li>
        <li>Community: open-source delivery strengthens transparency and adoption confidence.</li>
      </ul>
    </section>

    <section class="section-actions">
      <a class="primary-btn" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">Review the Repository -></a>
    </section>

    <section class="card quote"><blockquote>${escapeHtml(analysis.narrative)}</blockquote></section>
  `

  return renderPage({ analysis, pageKey: 'executive', pageName: 'Executive', hero, body })
}

function renderPage({ analysis, pageKey, pageName, hero, body, extraScript = '' }) {
  const meta = analysis.meta
  const palette = getPalette(meta.primaryLanguage)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageName)} - ${escapeHtml(meta.name)} | RepoLens</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
  ${getSharedStyles(palette)}
</head>
<body>
  ${renderNav(pageKey, meta)}
  <main>${hero}${body}</main>
  ${renderFooter(meta)}
  <script>${extraScript}</script>
</body>
</html>`
}

function renderNav(pageKey, meta) {
  const links = [
    ['index', 'Hub', './index.html'],
    ['engineering', 'Engineering', './engineering.html'],
    ['product', 'Product', './product.html'],
    ['capability', 'Capability', './capability.html'],
    ['executive', 'Executive', './executive.html']
  ]
  return `
    <nav class="top-nav">
      <div class="nav-links">${links.map(([k, label, href]) => `<a class="nav-link ${k === pageKey ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</div>
      <a class="repo-link mono" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">GitHub -></a>
    </nav>
  `
}

function renderFooter(meta) {
  return `
    <footer class="footer">
      <div class="mono">RepoLens | Generated by RepoLens</div>
      <div class="mono">${escapeHtml(meta.fullName)}</div>
      <a class="ghost-btn" href="${escapeHtml(meta.repoUrl)}" target="_blank" rel="noreferrer">View on GitHub</a>
    </footer>
  `
}
function getSharedStyles(palette) {
  return `
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: ${palette.accent};
      --accent-soft: ${palette.accentSoft};
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: 'DM Sans', sans-serif;
      background: radial-gradient(circle at 20% -10%, rgba(88, 166, 255, 0.14), transparent 45%), var(--bg);
      color: var(--text);
      padding-top: 56px;
      min-height: 100vh;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .muted { color: var(--muted); }
    .top-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(13, 17, 23, 0.96);
      border-bottom: 1px solid var(--border);
      padding: 0 18px;
      z-index: 20;
      backdrop-filter: blur(8px);
    }
    .nav-links { display: flex; gap: 8px; flex-wrap: wrap; }
    .nav-link, .repo-link {
      color: var(--text);
      text-decoration: none;
      font-size: 12px;
      border: 1px solid transparent;
      padding: 6px 10px;
      border-radius: 8px;
      transition: all .2s ease;
    }
    .nav-link:hover, .repo-link:hover {
      border-color: var(--border);
      background: rgba(255, 255, 255, 0.04);
    }
    .nav-link.active {
      border-color: var(--accent);
      background: rgba(88, 166, 255, 0.12);
      color: var(--accent);
    }
    main {
      width: min(1100px, 92%);
      margin: 28px auto 28px;
      display: grid;
      gap: 18px;
      animation: enter .5s ease both;
    }
    .hero {
      background: linear-gradient(135deg, rgba(88, 166, 255, 0.18), rgba(88, 166, 255, 0.03));
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      display: grid;
      gap: 12px;
    }
    .hero-gradient {
      position: relative;
      overflow: hidden;
    }
    .hero-gradient::before {
      content: '';
      position: absolute;
      inset: -30%;
      background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.08), transparent);
      animation: sweep 7s linear infinite;
    }
    .hero > * { position: relative; z-index: 1; }
    .hero h1 {
      margin: 0;
      font-family: 'Syne', sans-serif;
      font-size: clamp(32px, 5vw, 52px);
      line-height: 1.05;
    }
    .hero .lead { margin: 0; color: var(--text); max-width: 80ch; }
    .eyebrow {
      margin: 0;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge {
      display: inline-flex;
      width: fit-content;
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 13px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.03);
    }
    .badge-green { color: #3fb950; border-color: #3fb95066; }
    .badge-yellow { color: #d29922; border-color: #d2992266; }
    .badge-orange { color: #f0883e; border-color: #f0883e66; }
    .badge-blue { color: #58a6ff; border-color: #58a6ff66; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
      animation: rise .45s ease both;
    }
    .stats-grid, .split-grid, .metric-strip {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .stat-card h2 { margin: 8px 0 0; font-size: 30px; }
    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .chip {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
      font-family: 'JetBrains Mono', monospace;
    }
    .chip.subtle { color: var(--muted); }
    .primary-btn, .ghost-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      padding: 9px 12px;
      border: 1px solid transparent;
      transition: all .2s ease;
      color: var(--text);
      background: transparent;
    }
    .primary-btn {
      background: var(--accent);
      color: #0d1117;
    }
    .primary-btn:hover { filter: brightness(1.08); }
    .ghost-btn {
      border-color: var(--border);
      background: rgba(255, 255, 255, 0.02);
    }
    .ghost-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .section-actions {
      margin-top: 14px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .plain-list {
      margin: 8px 0 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
    }
    .compare {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 14px;
    }
    .compare th, .compare td {
      text-align: left;
      border: 1px solid var(--border);
      padding: 10px;
      vertical-align: top;
    }
    .compare th { background: rgba(255, 255, 255, 0.03); }
    .journey {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .journey-step {
      min-width: 120px;
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .journey-step span {
      display: inline-flex;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      align-items: center;
      justify-content: center;
      background: var(--accent);
      color: #0d1117;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .journey-link { color: var(--accent); font-family: 'JetBrains Mono', monospace; }
    .stack-groups {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .stack-column {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
    }
    .stack-column h4 { margin: 0 0 8px; }
    .steps {
      margin: 8px 0 0;
      display: grid;
      gap: 8px;
      padding-left: 18px;
    }
    .arch-map {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 8px;
    }
    .arch-node {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      position: relative;
    }
    .arch-node::after {
      content: '';
      position: absolute;
      right: -9px;
      top: 50%;
      width: 8px;
      border-top: 1px dashed var(--border);
    }
    .arch-node h4 { margin: 0 0 8px; }
    .arch-node p { margin: 0; color: var(--muted); font-size: 14px; }
    .code-wrap {
      position: relative;
      margin-top: 10px;
    }
    pre {
      margin: 0;
      background: #0b0f14;
      border: 1px solid #27313b;
      border-radius: 12px;
      padding: 14px;
      overflow: auto;
      color: #c9d1d9;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
    }
    details.decision {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
      margin-top: 8px;
      background: rgba(255, 255, 255, 0.02);
    }
    details.decision summary { cursor: pointer; font-weight: 600; }
    .perspective-card { border-left: 3px solid var(--accent); }
    .audience-engineering { border-left-color: #3fb950; }
    .audience-product { border-left-color: #58a6ff; }
    .audience-capability { border-left-color: #d29922; }
    .audience-executive { border-left-color: #f0883e; }
    .feature-card h4 { margin: 0 0 8px; }
    .quote blockquote {
      margin: 0;
      border-left: 4px solid var(--accent);
      padding: 12px 14px;
      font-style: italic;
      font-size: clamp(18px, 3vw, 24px);
      line-height: 1.4;
      background: rgba(255, 255, 255, 0.02);
    }
    .radial-wrap {
      background: radial-gradient(circle, rgba(88,166,255,0.08), transparent 65%);
      border-radius: 14px;
      min-height: 340px;
      display: grid;
      place-items: center;
      overflow: auto;
    }
    .footer {
      width: min(1100px, 92%);
      margin: 16px auto 24px;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
      align-items: center;
      background: var(--surface);
      font-size: 12px;
    }
    @keyframes enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes sweep {
      from { transform: translateX(-35%); }
      to { transform: translateX(40%); }
    }
    @media (max-width: 760px) {
      body { padding-top: 70px; }
      .top-nav { height: auto; min-height: 56px; padding: 8px 12px; flex-direction: column; align-items: flex-start; gap: 8px; }
      .journey-link { display: none; }
      .footer { flex-direction: column; align-items: flex-start; }
      .arch-node::after { display: none; }
    }
  </style>
  `
}

function getPalette(language) {
  const lang = String(language || '').toLowerCase()
  if (lang.includes('javascript') || lang.includes('typescript')) return { accent: '#f7df1e', accentSoft: 'rgba(247, 223, 30, 0.2)' }
  if (lang.includes('python')) return { accent: '#3572A5', accentSoft: 'rgba(53, 114, 165, 0.2)' }
  if (lang.includes('rust')) return { accent: '#DEA584', accentSoft: 'rgba(222, 165, 132, 0.2)' }
  if (lang === 'go') return { accent: '#00ACD7', accentSoft: 'rgba(0, 172, 215, 0.2)' }
  return { accent: '#58a6ff', accentSoft: 'rgba(88, 166, 255, 0.2)' }
}

function buildTechnicalThesis(analysis) {
  const language = analysis.meta.primaryLanguage || 'multi-language'
  const pattern = analysis.architecture.patterns[0] || 'modular architecture'
  return `${analysis.meta.name} uses a ${pattern} built primarily with ${language}. The project emphasizes reusable modules, maintainable boundaries, and practical operational fit.`
}

function deriveHowItWorks(analysis) {
  return [
    'Clone the repository and install dependencies based on the project package manager.',
    `Initialize the runtime environment for ${analysis.meta.primaryLanguage || 'the primary stack'} components.`,
    `Activate key modules: ${analysis.architecture.components.slice(0, 3).map(item => item.name).join(', ')}.`,
    'Run the documented command path and validate behavior through existing test and workflow checks.'
  ]
}

function productValueLine(analysis) {
  return `${analysis.meta.name} converts implementation complexity into predictable value by packaging workflows, documentation, and reusable components for faster outcomes.`
}

function problemNarrative(analysis) {
  const industry = analysis.context.industry || 'software teams'
  return `${industry} often face fragmented tooling, inconsistent setup quality, and long onboarding cycles. ${analysis.meta.name} addresses this by reducing ambiguity and giving teams a concrete path from idea to execution.`
}

function solutionNarrative(analysis) {
  const firstFeature = analysis.features[0]?.name || 'structured delivery'
  return `The repository aligns around ${firstFeature} and complementary capabilities, creating a focused workflow that is easier to adopt, adapt, and scale across teams.`
}

function capabilityThesis(analysis) {
  const domain = analysis.domains[0]?.name || 'Software Engineering'
  return `${analysis.meta.name} can be extended beyond its immediate use case into ${domain} and adjacent domains by reusing its architecture patterns and tooling choices.`
}

function combinationPlays(analysis) {
  const stack = analysis.techStack.map(item => item.name)
  const plays = []
  plays.push(`Combine ${analysis.meta.name} with CI pipelines to shorten release feedback loops.`)
  plays.push(`Pair ${analysis.meta.name} with observability tooling for stronger operational governance.`)
  if (stack.find(item => item.includes('GraphQL') || item.includes('API'))) {
    plays.push('Integrate API-first components into partner platforms to unlock interoperability opportunities.')
  } else {
    plays.push('Extend core modules into adjacent team workflows without rebuilding project foundations.')
  }
  return plays
}

function emergingOpportunity(analysis) {
  const topics = analysis.meta.topics.slice(0, 3).join(', ')
  return `As adoption of ${topics || 'modular software systems'} continues, ${analysis.meta.name} is positioned as a reusable foundation for teams seeking faster delivery with strong maintainability.`
}

function executiveStatement(analysis) {
  return `${analysis.meta.name} exists to turn a recurring engineering problem into a repeatable, scalable operating advantage.`
}

function executiveOpportunity(analysis) {
  const metricLine = analysis.metrics.userProvided.metrics
  if (metricLine) {
    return `This repository addresses an operational bottleneck with measurable impact potential: ${metricLine}. Public traction and contributor activity indicate strong relevance and continued momentum.`
  }
  return 'This repository addresses a high-frequency execution challenge and provides a reusable implementation baseline. Community signals suggest it can reduce delivery risk while accelerating roadmap execution.'
}

function primaryAudience(analysis) {
  return analysis.personas[0]?.role || 'faster, maintainable software delivery'
}

function primaryCapabilities(analysis) {
  return analysis.techStack.slice(0, 3).map(item => item.name).join(', ') || 'core engineering patterns'
}

function buildDomainRadial(repoName, domains) {
  const centerX = 320
  const centerY = 170
  const radius = 120
  const points = domains.map((domain, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(domains.length, 1)
    return {
      label: domain.name,
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius)
    }
  })

  return `
    <svg width="640" height="340" viewBox="0 0 640 340" role="img" aria-label="Capability map">
      ${points.map(point => `<line x1="${centerX}" y1="${centerY}" x2="${point.x}" y2="${point.y}" stroke="#30363d" stroke-dasharray="4 5"/>`).join('')}
      <circle cx="${centerX}" cy="${centerY}" r="54" fill="#161b22" stroke="#58a6ff" stroke-width="2"></circle>
      <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" fill="#e6edf3" font-size="13" font-family="JetBrains Mono">${escapeHtml(repoName)}</text>
      ${points.map(point => `
        <circle cx="${point.x}" cy="${point.y}" r="38" fill="#0d1117" stroke="#30363d" stroke-width="1.5"></circle>
        <text x="${point.x}" y="${point.y}" text-anchor="middle" dominant-baseline="middle" fill="#8b949e" font-size="11" font-family="JetBrains Mono">${escapeHtml(trimLabel(point.label, 15))}</text>
      `).join('')}
    </svg>
  `
}

function shortSummary(text) {
  const cleaned = String(text || '').trim()
  return cleaned.length <= 68 ? cleaned : `${cleaned.slice(0, 65)}...`
}

function toTitleCase(text) {
  return String(text || '').split(' ').map(word => word ? `${word[0].toUpperCase()}${word.slice(1)}` : '').join(' ')
}

function groupBy(items, key) {
  return (items || []).reduce((acc, item) => {
    const bucket = item[key] || 'other'
    if (!acc[bucket]) acc[bucket] = []
    acc[bucket].push(item)
    return acc
  }, {})
}

function featureEmoji(index) {
  const icons = ['?', '??', '??', '??', '??', '??', '??', '??']
  return icons[index % icons.length]
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatDate(value) {
  if (!value) return 'Unknown'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toISOString().slice(0, 10)
}

function trimLabel(text, max) {
  return String(text).length <= max ? text : `${String(text).slice(0, max - 1)}.`
}

function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
