for (const directory of document.querySelectorAll('.directory-content')) {
  const search = directory.querySelector('.search')
  const entries = [...directory.querySelectorAll('.directory-entry')]
  const groups = [...directory.querySelectorAll('.directory-group')]
  const empty = directory.querySelector('.empty-state')
  search?.addEventListener('input', () => {
    const term = search.value.trim().toLocaleLowerCase()
    let visible = 0
    for (const entry of entries) {
      entry.hidden = Boolean(term) && !entry.dataset.search?.includes(term)
      if (!entry.hidden) visible++
    }
    for (const group of groups) group.hidden = !group.querySelector('.directory-entry:not([hidden])')
    if (empty) empty.hidden = visible > 0
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
    if (search) { event.preventDefault(); search.focus() }
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
