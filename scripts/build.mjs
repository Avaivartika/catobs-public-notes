import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'notes')
const output = path.join(root, 'dist')
const base = (process.env.SITE_BASE || '/catobs-public-notes/').replace(/\/?$/, '/')
const siteUrl = 'https://avaivartika.github.io' + base
const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
md.use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { throwOnError: false } })

function walk(folder) {
  if (!fs.existsSync(folder)) return []
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
function encodedPath(value) { return value.split('/').map(encodeURIComponent).join('/') }
function cleanPath(value) {
  try { return decodeURIComponent(value).split('#')[0].split('?')[0] } catch { return value }
}
function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return [{}, content]
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([\w-]+):\s*(.*)$/)
    if (field) data[field[1]] = field[2].replace(/^['"]|['"]$/g, '')
  }
  return [data, content.slice(match[0].length)]
}
const paths = walk(source)
const markdownPaths = paths.filter(file => file.toLowerCase().endsWith('.md'))
const fileByName = new Map(paths.map(file => [path.basename(file).toLowerCase(), file]))
const notes = markdownPaths.map(file => {
  const rel = path.relative(source, file).split(path.sep).join('/')
  const [data, body] = splitFrontmatter(fs.readFileSync(file, 'utf8'))
  const title = data.title || path.basename(rel, '.md')
  const category = rel.includes('/') ? rel.split('/')[0] : '未分类'
  const plain = body.replace(/!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[\n\r#*_>`~|{}$]/g, ' ')
    .replace(/\s+/g, ' ').trim()
  return { file, rel, body, title, category, excerpt: data.description || plain.slice(0, 165) }
}).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
const noteByRel = new Map(notes.map(note => [note.rel.toLowerCase(), note]))
const noteByTitle = new Map(notes.map(note => [note.title.toLowerCase(), note]))
const categories = [...new Set(notes.map(note => note.category))].sort((a, b) => a.localeCompare(b, 'zh-CN'))

function noteUrl(note) { return base + 'n/' + encodedPath(note.rel.slice(0, -3)) + '/' }
function resolveTarget(note, raw, image = false) {
  if (raw.startsWith(base)) return raw
  if (/^(https?:|data:|mailto:|#)/i.test(raw)) return raw
  const target = cleanPath(raw)
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(note.rel), target))
  if (relative.startsWith('../') || relative === '..' || path.posix.isAbsolute(relative)) return '#'
  if (!image) {
    const found = noteByRel.get(relative.toLowerCase()) || noteByRel.get((relative + '.md').toLowerCase()) || noteByTitle.get(target.toLowerCase())
    if (found) return noteUrl(found)
  }
  let asset = relative
  if (!fs.existsSync(path.join(source, asset))) {
    const fallback = fileByName.get(path.posix.basename(target).toLowerCase())
    if (fallback) asset = path.relative(source, fallback).split(path.sep).join('/')
  }
  return base + 'files/' + encodedPath(asset)
}
function expandWiki(text, note) {
  return text.replace(/(!?)\[\[([^\]]+)\]\]/g, (_, bang, content) => {
    const [target, label] = content.split('|')
    const href = resolveTarget(note, target, Boolean(bang))
    const visible = label || path.posix.basename(target, path.posix.extname(target))
    return bang ? `![${visible}](${href})` : `[${visible}](${href})`
  })
}
const defaultLink = md.renderer.rules.link_open || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const hrefIndex = tokens[index].attrIndex('href')
  if (hrefIndex >= 0) tokens[index].attrs[hrefIndex][1] = resolveTarget(env.note, tokens[index].attrs[hrefIndex][1])
  return defaultLink(tokens, index, options, env, self)
}
const defaultImage = md.renderer.rules.image || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
md.renderer.rules.image = (tokens, index, options, env, self) => {
  const srcIndex = tokens[index].attrIndex('src')
  if (srcIndex >= 0) tokens[index].attrs[srcIndex][1] = resolveTarget(env.note, tokens[index].attrs[srcIndex][1], true)
  tokens[index].attrSet('loading', 'lazy')
  return defaultImage(tokens, index, options, env, self)
}

function icon(name) {
  const shapes = {
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11H3V6Z"/>',
    home: '<path d="m3 11 9-8 9 8v9H3v-9Z"/><path d="M9 20v-6h6v6"/>',
    github: '<path d="M9 19c-4 1-4-2-6-2m12 4v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.4 6a4.3 4.3 0 0 0-.1-3s-1 0-3 1.6a10 10 0 0 0-6 0C7.3 3 6.3 3 6.3 3a4.3 4.3 0 0 0-.1 3A4.7 4.7 0 0 0 5 9.3c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 9.7 18V21"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`
}
function sidebar(active) {
  const list = categories.map(category => {
    const group = notes.filter(note => note.category === category)
    return `<div class="side-group"><div class="side-label">${icon('folder')}<span>${escapeHtml(category)}</span><span class="side-count">${group.length}</span></div>${group.map(note => `<a class="side-note ${note === active ? 'selected' : ''}" href="${noteUrl(note)}">${escapeHtml(note.title)}</a>`).join('')}</div>`
  }).join('')
  return `<aside class="sidebar" id="sidebar"><a class="brand" href="${base}"><span class="brand-mark">${icon('book')}</span><span><strong>Catwarrior's Notes</strong><small>PUBLIC NOTEBOOK</small></span></a><div class="side-heading">探索笔记</div><a class="side-home ${active ? '' : 'selected'}" href="${base}">${icon('home')}<span>全部笔记</span><b>${notes.length}</b></a>${list}<div class="side-bottom"><span class="status-dot"></span>从 Obsidian 选择公开的内容</div></aside>`
}
function shell(pageTitle, content, active = null, description = '') {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f6f5f2"><meta name="description" content="${escapeHtml(description || 'Catwarrior 的公开笔记：从 Obsidian 精选并分享的内容。')}"><title>${escapeHtml(pageTitle)} · Catwarrior's Notes</title><link rel="canonical" href="${active ? siteUrl + 'n/' + encodedPath(active.rel.slice(0,-3)) + '/' : siteUrl}"><link rel="stylesheet" href="${base}style.css"><link rel="stylesheet" href="${base}katex.min.css"><link rel="icon" href="${base}favicon.svg" type="image/svg+xml"></head><body>${sidebar(active)}<div class="page"><header class="topbar"><button class="mobile-menu" id="menu" aria-label="打开目录">${icon('menu')}</button><a class="top-brand" href="${base}">Catwarrior's Notes</a><span class="top-spacer"></span><a class="top-link" href="https://github.com/Avaivartika/catobs-public-notes" target="_blank" rel="noopener">GitHub ${icon('arrow')}</a></header>${content}<footer class="footer"><span>由 Obsidian 选择公开 · 在 GitHub 持续更新</span><a href="https://github.com/Avaivartika/catobs-public-notes">查看源文件 ${icon('arrow')}</a></footer></div><script src="${base}app.js" defer></script></body></html>`
}
function card(note, index) {
  return `<a class="note-card" href="${noteUrl(note)}" data-search="${escapeHtml((note.title + ' ' + note.category + ' ' + note.excerpt).toLowerCase())}"><div class="card-top"><span class="card-index">${String(index + 1).padStart(2, '0')}</span><span class="pill">${escapeHtml(note.category)}</span></div><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.excerpt || '打开这篇笔记，继续阅读。')}</p><span class="card-bottom">阅读笔记 <span>${icon('arrow')}</span></span></a>`
}
const categoryButtons = [`<button class="filter active" data-filter="all">全部 <span>${notes.length}</span></button>`, ...categories.map(category => `<button class="filter" data-filter="${escapeHtml(category)}">${escapeHtml(category)} <span>${notes.filter(n => n.category === category).length}</span></button>`)].join('')
const home = `<main class="home"><div class="eyebrow"><span class="sparkle">✳</span> A PUBLIC NOTEBOOK</div><section class="hero"><div><span class="hero-kicker">整理 · 记录 · 分享</span><h1>把想法，<br><em>留在这里。</em></h1><p>从 Obsidian 中挑选值得公开的笔记。按主题浏览，或者直接搜索你感兴趣的内容。</p><a class="hero-cta" href="#browse">开始浏览 ${icon('arrow')}</a></div><div class="hero-art" aria-hidden="true"><div class="art-sheet art-back"></div><div class="art-sheet art-front"><span class="art-star">✳</span><span class="art-line long"></span><span class="art-line medium"></span><span class="art-line short"></span><span class="art-rule"></span><span class="art-line medium"></span><span class="art-line long"></span><span class="art-line short"></span></div><span class="art-caption">IDEAS, IN THE OPEN.</span></div></section><section class="browse" id="browse"><div class="section-heading"><div><span class="section-overline">EXPLORE THE COLLECTION</span><h2>公开笔记 <span>${notes.length.toString().padStart(2, '0')}</span></h2></div><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="搜索标题、分类或内容" autocomplete="off" aria-label="搜索笔记"><kbd>⌘ K</kbd></label></div><div class="filters" id="filters">${categoryButtons}</div><div class="card-grid" id="cards">${notes.map(card).join('')}</div><div class="empty-state" id="empty" hidden>没有找到匹配的笔记。试试别的关键词。</div></section><section class="about-strip"><span class="about-symbol">✳</span><div><strong>这些笔记会持续更新。</strong><p>只展示我主动选中的内容，新增笔记会自动出现在这里。</p></div><a href="https://github.com/Avaivartika/catobs-public-notes">访问 GitHub 仓库 ${icon('arrow')}</a></section></main>`

fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(output, { recursive: true })
for (const file of paths.filter(f => !f.toLowerCase().endsWith('.md'))) {
  const dest = path.join(output, 'files', path.relative(source, file))
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(file, dest)
}
for (const asset of ['style.css', 'app.js', 'favicon.svg']) fs.copyFileSync(path.join(root, 'site', asset), path.join(output, asset))
fs.copyFileSync(path.join(root, 'node_modules/katex/dist/katex.min.css'), path.join(output, 'katex.min.css'))
fs.cpSync(path.join(root, 'node_modules/katex/dist/fonts'), path.join(output, 'fonts'), { recursive: true })
fs.writeFileSync(path.join(output, '.nojekyll'), '')
fs.writeFileSync(path.join(output, 'index.html'), shell('公开笔记', home))
for (const note of notes) {
  const directory = path.join(output, 'n', note.rel.slice(0, -3))
  fs.mkdirSync(directory, { recursive: true })
  let html = md.render(expandWiki(note.body, note), { note })
  if (!/^\s*<h1[ >]/.test(html)) html = `<h1>${escapeHtml(note.title)}</h1>` + html
  const crumb = `<nav class="breadcrumbs" aria-label="面包屑"><a href="${base}">全部笔记</a><span>/</span><span>${escapeHtml(note.category)}</span><span>/</span><strong>${escapeHtml(note.title)}</strong></nav>`
  const article = `<main class="article-wrap">${crumb}<div class="article-layout"><article class="article"><div class="article-meta"><span class="pill">${escapeHtml(note.category)}</span><span>公开笔记</span></div><div class="prose">${html}</div><div class="article-end"><span>✳</span><p>读到这里，感谢你的时间。</p></div></article><aside class="article-aside"><span class="aside-heading">这篇笔记</span><a href="https://github.com/Avaivartika/catobs-public-notes/blob/main/notes/${encodedPath(note.rel)}">${icon('github')} 在 GitHub 查看原文</a><a href="${base}">${icon('arrow')} 返回笔记首页</a></aside></div></main>`
  fs.writeFileSync(path.join(directory, 'index.html'), shell(note.title, article, note, note.excerpt))
}
fs.writeFileSync(path.join(output, 'search.json'), JSON.stringify(notes.map(note => ({ title: note.title, category: note.category, excerpt: note.excerpt, url: noteUrl(note) }))))
fs.writeFileSync(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[siteUrl, ...notes.map(n => siteUrl + 'n/' + encodedPath(n.rel.slice(0, -3)) + '/')].map(url => `<url><loc>${escapeHtml(url)}</loc></url>`).join('')}</urlset>`)
const previewNotes = notes.slice(0, 4)
const previewHeight = 170 + Math.max(previewNotes.length, 1) * 44
const previewRows = previewNotes.length ? previewNotes.map((note, index) => `<text x="38" y="${143 + index * 44}" font-size="19" font-weight="600" fill="#263d31">${escapeHtml(note.title.length > 27 ? note.title.slice(0, 26) + '…' : note.title)}</text><text x="840" y="${143 + index * 44}" text-anchor="end" font-size="14" fill="#6d8974">${escapeHtml(note.category)}</text>${index < previewNotes.length - 1 ? `<line x1="38" x2="862" y1="${157 + index * 44}" y2="${157 + index * 44}" stroke="#dce7dc"/>` : ''}`).join('') : '<text x="38" y="143" font-size="18" fill="#678472">公开笔记即将出现在这里</text>'
const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${previewHeight}" viewBox="0 0 900 ${previewHeight}" role="img" aria-label="公开笔记目录预览"><rect width="900" height="${previewHeight}" rx="16" fill="#edf3ec"/><rect x="0" y="0" width="8" height="${previewHeight}" rx="4" fill="#527a5e"/><text x="38" y="34" font-size="12" font-weight="700" letter-spacing="3" fill="#74917d">CATWARRIOR'S PUBLIC NOTEBOOK</text><text x="38" y="83" font-size="31" font-weight="700" fill="#214b38">公开笔记</text><rect x="775" y="47" width="88" height="42" rx="21" fill="#dbe9da"/><text x="819" y="74" text-anchor="middle" font-size="19" font-weight="700" fill="#38644a">${notes.length} 篇</text><line x1="38" x2="862" y1="104" y2="104" stroke="#d4e2d2"/>${previewRows}<line x1="38" x2="862" y1="${previewHeight - 44}" y2="${previewHeight - 44}" stroke="#d4e2d2"/><text x="38" y="${previewHeight - 17}" font-size="14" fill="#6c8672">从 Obsidian 挑选，持续更新</text><text x="862" y="${previewHeight - 17}" text-anchor="end" font-size="14" font-weight="700" fill="#38644a">打开笔记站 ↗</text></svg>`
fs.writeFileSync(path.join(output, 'notes-preview.svg'), preview)
console.log(`Built ${notes.length} notes in ${output}`)
