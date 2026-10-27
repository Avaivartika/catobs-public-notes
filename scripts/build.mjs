import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import { renderShell, renderHome, renderArticle, renderPreview } from './layout.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'notes')
const output = path.join(root, 'dist')
const styleVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'site', 'style.css'))).digest('hex').slice(0, 10)
const base = (process.env.SITE_BASE || '/catobs-public-notes/').replace(/\/?$/, '/')
const siteUrl = 'https://avaivartika.github.io' + base
const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
md.use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { throwOnError: false } })
md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
  env.headingIndex = (env.headingIndex || 0) + 1
  const id = 'section-' + env.headingIndex
  tokens[index].attrSet('id', id)
  env.headings.push({
    id,
    level: Number(tokens[index].tag.slice(1)),
    text: tokens[index + 1].content
  })
  return self.renderToken(tokens, index, options)
}

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
function excerptFrom(body) {
  const clean = value => value.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_~]/g, '').replace(/\s+/g, ' ').trim()
  const prose = body.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')
  // Prefer an actual introduction before the first section, not commands inside a procedure.
  const opening = prose.split(/^#{2,6}\s/m)[0].split(/\n\s*\n/).map(clean)
    .find(part => part.length >= 16 && !/^(#|!|>|[-*+] |\d+\.)/.test(part) && !/https?:|127\.0\.0\.1/.test(part))
  if (opening) return opening.length > 100 ? opening.slice(0, 97) + '…' : opening
  const headings = [...prose.matchAll(/^#{2,6}\s+(.+)$/gm)].map(m => clean(m[1]).replace(/^\d+[.、)]\s*/, ''))
    .filter(h => !/^(核心目标|目录|前情提要|参考|总结|附件|快速模板)/.test(h)).slice(0, 4)
  if (headings.length) return `内容包括${headings.join('、')}。`.slice(0, 120)
  return '查看笔记正文。'
}
const paths = walk(source)
const markdownPaths = paths.filter(file => file.toLowerCase().endsWith('.md'))
const fileByName = new Map(paths.map(file => [path.basename(file).toLowerCase(), file]))
const notes = markdownPaths.map(file => {
  const rel = path.relative(source, file).split(path.sep).join('/')
  const [data, body] = splitFrontmatter(fs.readFileSync(file, 'utf8'))
  const firstHeading = body.match(/^#\s+(.+)$/m)?.[1]
  const title = data.title || firstHeading || path.basename(rel, '.md')
  const category = rel.includes('/') ? rel.split('/')[0] : '未分类'
  let committedAt
  try { if (!data.created && !data.date) committedAt = execFileSync('git', ['log', '--follow', '--diff-filter=A', '--format=%aI', '--', file], { cwd: root, encoding: 'utf8' }).trim().split('\n').at(-1) } catch {}
  const candidate = data.created || data.date || committedAt
  const date = candidate && Number.isFinite(Date.parse(candidate)) ? new Date(candidate).toISOString() : fs.statSync(file).mtime.toISOString()
  return { file, rel, body, title, category, date, excerpt: data.description || excerptFrom(body) }
}).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
const noteByRel = new Map(notes.map(note => [note.rel.toLowerCase(), note]))
const noteByTitle = new Map(notes.map(note => [note.title.toLowerCase(), note]))
const categories = [...new Set(notes.map(note => note.category))].sort((a, b) => a.localeCompare(b, 'zh-CN'))

const metadataPath = path.join(root, '.cache', 'listing.json')
if (process.argv.includes('--metadata')) {
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true })
  fs.writeFileSync(metadataPath, JSON.stringify({ notes: notes.map(note => ({
    sourcePath: note.rel, title: note.title, description: note.excerpt, date: note.date,
    tags: [note.category], kind: '笔记', path: 'notes'
  })) }, null, 2))
  console.log(`Prepared metadata for ${notes.length} notes`)
  process.exit(0)
}
const listing = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
const listingBySource = new Map(listing.notes.map(note => [note.sourcePath, note]))
for (const note of notes) {
  const metadata = listingBySource.get(note.rel)
  if (!metadata?.slug || metadata.title !== note.title || metadata.description !== note.excerpt)
    throw new Error(`Missing or stale translated metadata: ${note.rel}. Run npm run build.`)
  note.slug = metadata.slug
}
function noteUrl(note) { return base + 'n/' + note.slug + '/' }
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

fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(output, { recursive: true })
for (const file of paths.filter(f => !f.toLowerCase().endsWith('.md'))) {
  const dest = path.join(output, 'files', path.relative(source, file))
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(file, dest)
}
for (const asset of ['style.css', 'app.js', 'favicon.svg', 'horizon-archive.webp', 'font-cache.js']) fs.copyFileSync(path.join(root, 'site', asset), path.join(output, asset))
fs.mkdirSync(path.join(output, 'webfonts'), { recursive: true })
for (const font of ['FANDOL-COPYING.txt']) {
  fs.copyFileSync(path.join(root, 'site', 'webfonts', font), path.join(output, 'webfonts', font))
}
fs.copyFileSync(path.join(root, 'node_modules/katex/dist/katex.min.css'), path.join(output, 'katex.min.css'))
fs.cpSync(path.join(root, 'node_modules/katex/dist/fonts'), path.join(output, 'fonts'), { recursive: true })
fs.writeFileSync(path.join(output, '.nojekyll'), '')
function renderNote(note) {
  const body = note.body.replace(/^#\s+[^\n]+\n+/, '')
  const env = { note, headings: [], headingIndex: 0 }
  return { html: md.render(expandWiki(body, note), env), headings: env.headings }
}
const featured = notes.length ? renderNote(notes[0]) : { html: '', headings: [] }
const home = renderHome({ base, notes, categories, noteUrl, escapeHtml, featuredHtml: featured.html, featuredHeadings: featured.headings })
fs.writeFileSync(path.join(output, 'index.html'), renderShell({
  base, title: '笔记', canonical: siteUrl, body: home, escapeHtml, styleVersion
}))
for (const note of notes) {
  const directory = path.join(output, 'n', note.slug)
  fs.mkdirSync(directory, { recursive: true })
  const { html, headings } = renderNote(note)
  const article = renderArticle({ base, note, html, headings, notes, categories, noteUrl, escapeHtml })
  const canonical = 'https://avaivartika.github.io' + noteUrl(note)
  fs.writeFileSync(path.join(directory, 'index.html'), renderShell({
    base, title: note.title, description: note.excerpt, canonical, body: article, escapeHtml, styleVersion
  }))
}
fs.writeFileSync(path.join(output, 'search.json'), JSON.stringify(notes.map(note => ({ title: note.title, category: note.category, excerpt: note.excerpt, url: noteUrl(note) }))))
fs.writeFileSync(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[siteUrl, ...notes.map(n => 'https://avaivartika.github.io' + noteUrl(n))].map(url => `<url><loc>${escapeHtml(url)}</loc></url>`).join('')}</urlset>`)
const preview = renderPreview(notes, escapeHtml)
fs.writeFileSync(path.join(output, 'notes-preview.svg'), preview)
fs.writeFileSync(path.join(output, 'notes-overview.svg'), preview)
console.log(`Built ${notes.length} notes in ${output}`)

// Publish the index atomically with the article pages, so the blog never links to an unpublished build.
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify({
  version: 2,
  translation: listing.translation,
  generatedAt: new Date().toISOString(),
  notes: notes.map(note => ({
    ...listingBySource.get(note.rel),
    href: 'https://avaivartika.github.io' + noteUrl(note),
    tags: [note.category], kind: '笔记', path: 'notes'
  })).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}, null, 2) + '\n')
