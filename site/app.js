const search = document.querySelector('#search')
const entries = [...document.querySelectorAll('.entry')]
const filters = [...document.querySelectorAll('.filter')]
const empty = document.querySelector('#empty')
let category = 'all'

function updateList() {
  const term = search?.value.trim().toLocaleLowerCase() || ''
  let visible = 0
  for (const entry of entries) {
    const show = (category === 'all' || entry.dataset.category === category) &&
      (!term || entry.dataset.search?.toLocaleLowerCase().includes(term))
    entry.hidden = !show
    if (show) visible++
  }
  if (empty) empty.hidden = visible > 0
}

search?.addEventListener('input', updateList)
for (const filter of filters) filter.addEventListener('click', () => {
  category = filter.dataset.filter
  filters.forEach(item => item.classList.toggle('active', item === filter))
  updateList()
})

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && search) {
    event.preventDefault()
    search.focus()
  }
})
