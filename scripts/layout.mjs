const githubRepo = 'https://github.com/Avaivartika/catobs-public-notes'

export function renderShell({ base, title, description, canonical, body, escapeHtml, styleVersion }) {
  return '<!doctype html><html lang="zh-CN"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="theme-color" content="#e8e7e0">' +
    '<meta name="description" content="' + escapeHtml(description || 'Avaivartika 的文章与笔记。') + '">' +
    '<title>' + escapeHtml(title) + ' · Avaivartika</title>' +
    '<link rel="canonical" href="' + canonical + '">' +
    '<link rel="stylesheet" href="' + base + 'style.css?v=' + styleVersion + '">' +
    '<link rel="stylesheet" href="' + base + 'katex.min.css">' +
    '<link rel="icon" href="' + base + 'favicon.svg" type="image/svg+xml">' +
    '</head><body>' +
    '<header class="site-header"><div class="header-inner">' +
    '<a class="wordmark" href="https://avaivartika.github.io/" aria-label="Avaivartika 博客首页"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">    <path d="M6 39V9H31V15H12V39Z" fill="currentColor" />  <path d="M21 39V22H27V33H36V39Z" fill="currentColor" />  <path d="M35 9L40 14L35 19L30 14Z" fill="var(--accent, #be9276)" />  <path d="M6 44H16M21 44H36M41 24V34" stroke="currentColor" stroke-width="1.5" opacity=".55" /></svg><span>Avaivartika</span></a>' +
    '<nav class="main-nav" aria-label="主导航"><a href="https://avaivartika.github.io/">博客首页 ↗</a><a aria-current="page" href="' + base + '">笔记</a><a href="' + githubRepo + '">GitHub</a></nav>' +
    '</div></header>' + body +
    '<footer class="site-footer"><a href="https://avaivartika.github.io/">← 返回博客</a><a href="' + githubRepo + '">Markdown 源文件</a></footer>' +
    '<script src="' + base + 'app.js?v=' + styleVersion + '" defer></script></body></html>'
}

function directory(notes, categories, active, noteUrl, escapeHtml) {
  const groups = categories.map(category => {
    const links = notes.filter(note => note.category === category).map(note =>
      '<li class="directory-entry" data-search="' + escapeHtml((category + ' ' + note.title).toLocaleLowerCase()) + '">' +
      '<a' + (note.rel === active?.rel ? ' aria-current="page"' : '') + ' href="' + noteUrl(note) + '">' +
      escapeHtml(note.title) + '</a></li>').join('')
    return '<section class="directory-group"><h3>' + escapeHtml(category) + '</h3><ul>' + links + '</ul></section>'
  }).join('')
  return '<div class="directory-content"><label class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>' +
    '<input class="search" type="search" placeholder="搜索文章" aria-label="搜索文章" autocomplete="off"></label>' +
    '<div class="directory-groups">' + groups + '</div><p class="empty-state" hidden>没有找到匹配的文章。</p></div>'
}

function page({ base, note, html, headings, notes, categories, noteUrl, escapeHtml, home }) {
  const toc = headings.filter(heading => heading.level === 2 || heading.level === 3)
  const tocMarkup = toc.length > 1 ? '<aside class="toc" aria-label="本文目录"><h2>本文目录</h2>' +
    toc.map(heading => '<a class="toc-level-' + heading.level + '" href="#' + heading.id + '">' + escapeHtml(heading.text) + '</a>').join('') + '</aside>' : ''
  const sourceUrl = githubRepo + '/blob/main/notes/' + note.rel.split('/').map(encodeURIComponent).join('/')
  const dir = directory(notes, categories, note, noteUrl, escapeHtml)
  return '<main class="reading-layout">' +
    '<aside class="directory" aria-label="文章目录"><div class="directory-heading"><span>目录</span><span>' + notes.length + ' 篇</span></div>' + dir + '</aside>' +
    '<details class="mobile-directory"><summary>浏览文章 <span>' + notes.length + ' 篇</span></summary>' + dir + '</details>' +
    '<article class="post"><header class="post-heading"><div class="post-kicker"><span>' + escapeHtml(note.category) + '</span><span class="kicker-rule"></span><span>笔记</span></div>' +
    '<h1>' + escapeHtml(note.title) + '</h1></header>' +
    '<div class="prose">' + html + '</div>' +
    '<div class="post-links">' + (home ? '<a href="' + noteUrl(note) + '">文章独立链接</a>' : '<a href="' + base + '">返回首页</a>') +
    '<a href="' + sourceUrl + '">查看 Markdown</a></div></article>' + tocMarkup + '</main>'
}

export function renderHome({ notes, categories, noteUrl, escapeHtml }) {
  const sorted = [...notes].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const rows = sorted.map(note => {
    const date = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(note.date))
    return `<a class="note-row" data-category="${escapeHtml(note.category)}" data-search="${escapeHtml((note.title + ' ' + note.excerpt + ' ' + note.category).toLocaleLowerCase())}" href="${noteUrl(note)}"><div class="note-meta"><time datetime="${note.date}">${date}</time><span>${escapeHtml(note.category)}</span></div><div class="note-copy"><h2>${escapeHtml(note.title)}</h2><p>${escapeHtml(note.excerpt)}</p></div><span class="note-arrow" aria-hidden="true">↗</span></a>`
  }).join('')
  return `<main class="notes-home" id="main"><header class="index-intro"><span class="eyebrow">NOTES / 笔记</span><h1>思考与记录</h1><p>从 Obsidian 选择发布的笔记。</p></header><section class="index-layout" aria-label="笔记索引"><aside class="index-aside"><span class="eyebrow">01 — 目录</span><h2>笔记</h2><p><span id="note-count">${notes.length}</span> 篇记录</p><a href="https://avaivartika.github.io/">返回博客 ↗</a></aside><div class="index-main"><div class="index-controls"><div class="category-filters" aria-label="按分类筛选"><button type="button" data-category-filter="" aria-pressed="true">全部</button>${categories.map(c => `<button type="button" data-category-filter="${escapeHtml(c)}" aria-pressed="false">${escapeHtml(c)}</button>`).join('')}</div><label class="index-search"><span aria-hidden="true">⌕</span><input id="note-search" type="search" aria-label="搜索笔记" placeholder="搜索笔记" autocomplete="off"><kbd>⌘ K</kbd></label></div><div class="note-list">${rows}</div><p class="index-empty" hidden>没有找到匹配的笔记，请换个关键词。</p></div></section></main>`
}

export function renderArticle(args) { return page({ ...args, home: false }) }

export function renderPreview(notes, escapeHtml) {
  const shown = notes.slice(0, 4)
  const height = 114 + Math.max(shown.length, 1) * 50
  const rows = shown.length ? shown.map((note, index) =>
    '<text x="34" y="' + (100 + index * 50) + '" font-size="21" fill="#2d302b">' +
    escapeHtml(note.title.length > 27 ? note.title.slice(0, 26) + '…' : note.title) + '</text>' +
    '<text x="856" y="' + (100 + index * 50) + '" text-anchor="end" font-size="16" fill="#72786c">' + escapeHtml(note.category) + '</text>' +
    '<line x1="34" x2="866" y1="' + (118 + index * 50) + '" y2="' + (118 + index * 50) + '" stroke="#e0e2d9"/>').join('') :
    '<text x="34" y="100" font-size="18" fill="#72786c">暂无文章</text>'
  return '<svg xmlns="http://www.w3.org/2000/svg" font-family="Georgia, Noto Serif SC, Songti SC, STSong, serif" width="900" height="' + height + '" viewBox="0 0 900 ' + height + '" role="img" aria-label="公开笔记目录预览">' +
    '<rect x="1" y="1" width="898" height="' + (height - 2) + '" rx="7" fill="#fdfdfb" stroke="#e0e2d9"/>' +
    '<rect x="1" y="1" width="9" height="' + (height - 2) + '" fill="#76834c"/>' +
    '<text x="34" y="47" font-size="26" font-weight="400" fill="#2d302b">Catwarrior / 笔记</text>' +
    '<text x="856" y="46" text-anchor="end" font-size="16" fill="#72786c">' + notes.length + ' 篇文章</text>' +
    '<line x1="34" x2="866" y1="65" y2="65" stroke="#e0e2d9"/>' + rows +
    '<text x="856" y="' + (height - 16) + '" text-anchor="end" font-size="16" fill="#586e2b">阅读笔记 →</text></svg>'
}
