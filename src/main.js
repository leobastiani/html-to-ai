import { cleanHtml } from './cleanHtml.js'

const input = document.querySelector('#input')
const output = document.querySelector('#output')
const copyButton = document.querySelector('#copy')
const inputStats = document.querySelector('#input-stats')
const outputStats = document.querySelector('#output-stats')
// Each field `name` is a key of the `cleanHtml` options
const optionInputs = [...document.querySelectorAll('.options [name]')]
const readOptions = () =>
  Object.fromEntries(optionInputs.map((option) => [option.name, option.type === 'checkbox' ? option.checked : option.value]))

// ~4 chars per token is the usual rough estimate for English-ish text and markup
const describeSize = (text) => {
  const tokens = Math.ceil(text.length / 4)
  return `${text.length.toLocaleString('pt-BR')} chars · ~${tokens.toLocaleString('pt-BR')} tokens`
}

const render = () => {
  const html = input.value
  output.value = html.trim() ? cleanHtml(html, readOptions()) : ''
  inputStats.textContent = html ? describeSize(html) : ''
  const saved = html.length ? Math.round((1 - output.value.length / html.length) * 100) : 0
  outputStats.textContent = output.value ? `${describeSize(output.value)} · −${saved}%` : ''
  copyButton.disabled = !output.value
}

// Copying a selection of a rendered page puts its markup in `text/html`; copying source
// (e.g. DevTools "Copy outerHTML") only fills `text/plain`, which is already HTML
input.addEventListener('paste', (event) => {
  const html = event.clipboardData.getData('text/html')
  if (!html) return
  event.preventDefault()
  input.value = html
  render()
})

input.addEventListener('input', render)
optionInputs.forEach((option) => option.addEventListener('change', render))

copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value)
  copyButton.textContent = 'Copiado!'
  setTimeout(() => { copyButton.textContent = 'Copiar' }, 1500)
})
