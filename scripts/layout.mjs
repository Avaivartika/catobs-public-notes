const githubRepo = 'https://github.com/Avaivartika/catobs-public-notes'

export function renderShell({ base, title, description, canonical, body, escapeHtml }) {
  return '<!doctype html><html lang="zh-CN"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="theme-color" content="#fcfcfb">' +
    '<meta name="description" content="' + escapeHtml(description || 'Catwarrior 的文章与笔记。') + '">' +
    '<title>' + escapeHtml(title) + ' · Catwarrior</title>' +
    '<link rel="canonical" href="' + canonical + '">' +
    '<link rel="stylesheet" href="' + base + 'style.css">' +
    '<link rel="stylesheet" href="' + base + 'katex.min.css">' +
    '<link rel="icon" href="' + base + 'favicon.svg" type="image/svg+xml">' +
    '</head><body>' +
    '<header class="site-header"><div class="header-inner">' +
    '<a class="wordmark" href="' + base + '">Catwarrior<span class="wordmark-slash">/</span><span class="wordmark-note">笔记</span></a>' +
    '<nav class="main-nav" aria-label="主导航"><a href="' + base + '#articles">文章</a><a href="' + base + '#topics">分类</a><a href="' + githubRepo + '">GitHub</a></nav>' +
    '</div></header>' + body +
    '<footer class="site-footer"><div><span>Catwarrior · 笔记</span><a href="' + githubRepo + '">GitHub 仓库 ↗</a></div></footer>' +
    '<script src="' + base + 'app.js" defer></script></body></html>'
}

export function renderHome({ base, notes, categories, noteUrl, escapeHtml }) {
  const categoryButtons = [
    '<button class="filter active" data-filter="all" type="button">全部 <span>' + notes.length + '</span></button>',
    ...categories.map(category =>
      '<button class="filter" data-filter="' + escapeHtml(category) + '" type="button">' +
      escapeHtml(category) + ' <span>' + notes.filter(note => note.category === category).length + '</span></button>')
  ].join('')
  const entries = notes.map(note =>
    '<article class="entry" data-category="' + escapeHtml(note.category) + '" data-search="' +
    escapeHtml((note.title + ' ' + note.category + ' ' + note.excerpt).toLocaleLowerCase()) + '">' +
    '<div class="entry-meta"><span>' + escapeHtml(note.category) + '</span></div>' +
    '<h2><a href="' + noteUrl(note) + '">' + escapeHtml(note.title) + '</a></h2>' +
    '<p>' + escapeHtml(note.excerpt || '阅读全文。') + '</p>' +
    '<a class="entry-more" href="' + noteUrl(note) + '">阅读全文 <span aria-hidden="true">→</span></a>' +
    '</article>'
  ).join('')
  return '<main class="container home">' +
    '<div class="home-heading"><span>CATWARRIOR / NOTES</span><h1>笔记</h1></div>' +
    '<div class="listing-head" id="articles"><h2>文章 <span>共 ' + notes.length + ' 篇</span></h2>' +
    '<label class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>' +
    '<input id="search" type="search" placeholder="搜索文章" aria-label="搜索文章" autocomplete="off"></label></div>' +
    '<div class="filters" id="topics" aria-label="按分类筛选">' + categoryButtons + '</div>' +
    '<section class="entry-list" id="entries">' + entries + '</section>' +
    '<p class="empty-state" id="empty" hidden>没有找到匹配的文章。</p>' +
    '</main>'
}

export function renderArticle({ base, note, html, headings, noteUrl, escapeHtml }) {
  const toc = headings.filter(heading => heading.level === 2 || heading.level === 3)
  const tocMarkup = toc.length > 1
    ? '<aside class="toc"><div class="toc-title">本文目录</div>' +
      toc.map(heading => '<a class="toc-level-' + heading.level + '" href="#' + heading.id + '">' +
        escapeHtml(heading.text) + '</a>').join('') + '</aside>'
    : ''
  const sourceUrl = githubRepo + '/blob/main/notes/' + note.rel.split('/').map(encodeURIComponent).join('/')
  return '<main class="container article-page">' +
    '<nav class="breadcrumb" aria-label="面包屑"><a href="' + base + '">文章</a><span>/</span>' +
    '<span>' + escapeHtml(note.category) + '</span></nav>' +
    '<div class="article-grid"><article class="post">' +
    '<header class="post-heading"><div class="post-category">' + escapeHtml(note.category) + '</div>' +
    '<h1>' + escapeHtml(note.title) + '</h1></header>' +
    '<div class="prose">' + html + '</div>' +
    '<div class="post-links"><a href="' + base + '">← 返回文章列表</a><a href="' + sourceUrl + '">查看 Markdown 原文 ↗</a></div>' +
    '</article>' + tocMarkup + '</div></main>'
}

export function renderPreview(notes, escapeHtml) {
  const shown = notes.slice(0, 4)
  const height = 124 + Math.max(shown.length, 1) * 48
  const rows = shown.length
    ? shown.map((note, index) => '<text x="35" y="' + (104 + index * 48) +
      '" font-size="20" font-weight="600" fill="#20252a">' +
      escapeHtml(note.title.length > 27 ? note.title.slice(0, 26) + '…' : note.title) +
      '</text><text x="850" y="' + (104 + index * 48) +
      '" text-anchor="end" font-size="15" fill="#69717a">' + escapeHtml(note.category) + '</text>' +
      '<line x1="35" x2="865" y1="' + (119 + index * 48) + '" y2="' +
      (119 + index * 48) + '" stroke="#e4e7e9"/>').join('')
    : '<text x="35" y="104" font-size="18" fill="#69717a">暂无文章</text>'
  return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="' + height +
    '" viewBox="0 0 900 ' + height + '" role="img" aria-label="公开笔记目录预览">' +
    '<rect x="1" y="1" width="898" height="' + (height - 2) + '" rx="9" fill="#fcfcfb" stroke="#dfe3e6"/>' +
    '<text x="35" y="46" font-size="25" font-weight="700" fill="#20252a">Catwarrior · 笔记</text>' +
    '<text x="850" y="45" text-anchor="end" font-size="15" fill="#69717a">' + notes.length + ' 篇文章</text>' +
    '<line x1="35" x2="865" y1="64" y2="64" stroke="#dfe3e6"/>' + rows +
    '<text x="850" y="' + (height - 17) +
    '" text-anchor="end" font-size="15" font-weight="600" fill="#2c5b83">查看全部文章 →</text></svg>'
}
