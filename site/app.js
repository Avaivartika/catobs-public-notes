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
    const mobile = document.querySelector('.mobile-directory')
    if (mobile && getComputedStyle(mobile).display !== 'none') mobile.open = true
    const search = getComputedStyle(mobile || document.body).display !== 'none'
      ? mobile?.querySelector('.search') : document.querySelector('.directory .search')
    if (search) { event.preventDefault(); search.focus() }
  }
})
