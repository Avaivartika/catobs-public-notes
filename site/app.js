const menu = document.querySelector('#menu')
const sidebar = document.querySelector('#sidebar')
menu?.addEventListener('click', () => sidebar?.classList.toggle('open'))
document.addEventListener('click', event => {
  if (sidebar?.classList.contains('open') && !sidebar.contains(event.target) && !menu?.contains(event.target)) sidebar.classList.remove('open')
})

const search = document.querySelector('#search')
const cards = [...document.querySelectorAll('.note-card')]
const buttons = [...document.querySelectorAll('.filter')]
const empty = document.querySelector('#empty')
let category = 'all'
function applyFilters() {
  const term = search?.value.trim().toLocaleLowerCase() || ''
  let visible = 0
  for (const card of cards) {
    const inCategory = category === 'all' || card.querySelector('.pill')?.textContent === category
    const matches = !term || card.dataset.search?.toLocaleLowerCase().includes(term)
    card.hidden = !(inCategory && matches)
    if (!card.hidden) visible++
  }
  if (empty) empty.hidden = visible > 0
}
search?.addEventListener('input', applyFilters)
for (const button of buttons) button.addEventListener('click', () => {
  category = button.dataset.filter
  buttons.forEach(item => item.classList.toggle('active', item === button))
  applyFilters()
})
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && search) {
    event.preventDefault()
    search.focus()
    search.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
})
