for (const directory of document.querySelectorAll('.directory-content')) {
  const search = directory.querySelector('.search')
  const entries = [...directory.querySelectorAll('.directory-entry')]
  const groups = [...directory.querySelectorAll('.directory-group')]
  const empty = directory.querySelector('.empty-state')
  let savedOpen = null
  search?.addEventListener('input', () => {
    const term = search.value.trim().toLocaleLowerCase()
    if (term && !savedOpen) savedOpen = groups.map(group => group.open)
    let visible = 0
    for (const entry of entries) {
      entry.hidden = Boolean(term) && !entry.dataset.search?.includes(term)
      if (!entry.hidden) visible++
    }
    for (const group of [...groups].reverse()) {
      group.hidden = !group.querySelector('.directory-entry:not([hidden])')
      if (term && !group.hidden) group.open = true
    }
    if (!term && savedOpen) { groups.forEach((group, i) => group.open = savedOpen[i]); savedOpen = null }
    if (empty) empty.hidden = visible > 0
  })
  const store = (key, value) => { try { localStorage.setItem(key, value) } catch {} }
  for (const group of groups) {
    try { const state = localStorage.getItem('notes-folder:' + group.dataset.folder); if (state !== null) group.open = state === 'true' } catch {}
    if (group.querySelector('[aria-current="page"]')) group.open = true
    group.addEventListener('toggle', () => { if (!search.value.trim()) store('notes-folder:' + group.dataset.folder, String(group.open)) })
  }
  for (const button of directory.querySelectorAll('[data-tree-action]')) button.addEventListener('click', () => {
    for (const group of groups) group.open = button.dataset.treeAction === 'expand'
  })
}

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    const homeSearch = document.querySelector('#note-search')
    if (homeSearch) { event.preventDefault(); homeSearch.focus(); return }
    const mobile = document.querySelector('.mobile-directory')
    if (mobile && getComputedStyle(mobile).display !== 'none') mobile.open = true
    const search = getComputedStyle(mobile || document.body).display !== 'none'
      ? mobile?.querySelector('.search') : document.querySelector('.directory .search')
    if (search) { event.preventDefault(); if (document.querySelector('.sidebar-collapsed')) document.querySelector('.sidebar-toggle')?.click(); search.focus() }
  }
})

const homeSearch = document.querySelector('#note-search')
const filters = [...document.querySelectorAll('[data-category-filter]')]
const rows = [...document.querySelectorAll('.note-row')]
let category = ''
function filterNotes() {
  const term = homeSearch.value.trim().toLocaleLowerCase()
  let count = 0
  for (const row of rows) {
    row.hidden = (category && row.dataset.category !== category) || (term && !row.dataset.search.includes(term))
    if (!row.hidden) count++
  }
  document.querySelector('#note-count').textContent = count
  document.querySelector('.index-empty').hidden = count > 0
}
homeSearch?.addEventListener('input', filterNotes)
for (const button of filters) button.addEventListener('click', () => {
  category = button.dataset.categoryFilter
  for (const filter of filters) filter.setAttribute('aria-pressed', String(filter === button))
  filterNotes()
})

const readingLayout = document.querySelector('.reading-layout')
const sidebar = document.querySelector('.directory')
const resizeHandle = document.querySelector('.sidebar-resizer')
const sidebarToggle = document.querySelector('.sidebar-toggle')
if (sidebar && resizeHandle && sidebarToggle) {
  const save = (key, value) => { try { localStorage.setItem(key, String(value)) } catch {} }
  function setWidth(value) {
    const width = Math.round(Math.min(440, Math.max(200, value)))
    readingLayout.style.setProperty('--sidebar-width', width + 'px')
    resizeHandle.setAttribute('aria-valuenow', String(width))
    save('notes-sidebar-width', width)
  }
  function collapse(value) {
    readingLayout.classList.toggle('sidebar-collapsed', value)
    sidebarToggle.setAttribute('aria-expanded', String(!value))
    sidebarToggle.setAttribute('aria-label', value ? '展开侧栏' : '收起侧栏')
    sidebarToggle.title = value ? '展开侧栏' : '收起侧栏'
    save('notes-sidebar-collapsed', value)
  }
  try {
    const width = Number(localStorage.getItem('notes-sidebar-width'))
    if (width) setWidth(width)
    collapse(localStorage.getItem('notes-sidebar-collapsed') === 'true')
  } catch {}
  sidebarToggle.addEventListener('click', () => collapse(!readingLayout.classList.contains('sidebar-collapsed')))
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    event.preventDefault()
    resizeHandle.setPointerCapture(event.pointerId)
    readingLayout.classList.add('is-resizing')
  })
  resizeHandle.addEventListener('pointermove', event => {
    if (resizeHandle.hasPointerCapture(event.pointerId)) setWidth(event.clientX - sidebar.getBoundingClientRect().left)
  })
  const stop = () => readingLayout.classList.remove('is-resizing')
  resizeHandle.addEventListener('pointerup', stop)
  resizeHandle.addEventListener('lostpointercapture', stop)
  resizeHandle.addEventListener('pointercancel', stop)
  resizeHandle.addEventListener('dblclick', () => setWidth(260))
  resizeHandle.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
    event.preventDefault()
    const width = Number(resizeHandle.getAttribute('aria-valuenow'))
    setWidth(event.key === 'Home' ? 200 : event.key === 'End' ? 440 : width + (event.key === 'ArrowRight' ? 20 : -20))
  })
}
