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

const OPTIONS_STORAGE_KEY = 'html-to-ai:options'

// localStorage can throw (blocked site data, private windows), so persistence is best-effort
const saveOptions = () => {
  try {
    localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(readOptions()))
  } catch {
    // Options just won't be remembered
  }
}

const restoreOptions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(OPTIONS_STORAGE_KEY))
    if (!saved) return
    optionInputs.forEach((option) => {
      if (!(option.name in saved)) return
      if (option.type === 'checkbox') option.checked = saved[option.name] === true
      else option.value = saved[option.name]
    })
  } catch {
    // Corrupted or unavailable storage: keep the defaults from the HTML
  }
}

// ~4 chars per token is the usual rough estimate for English-ish text and markup
const describeSize = (text) => {
  const tokens = Math.ceil(text.length / 4)
  return `${text.length.toLocaleString('en-US')} chars · ~${tokens.toLocaleString('en-US')} tokens`
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
optionInputs.forEach((option) =>
  option.addEventListener('change', () => {
    saveOptions()
    render()
  }),
)

restoreOptions()
render()

copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value)
  copyButton.textContent = 'Copied!'
  setTimeout(() => { copyButton.textContent = 'Copy' }, 1500)
})
