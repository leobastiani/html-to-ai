// Turns the already cleaned DOM into Markdown. Anything without a Markdown equivalent
// (custom elements, `div`, `span`, ...) keeps only its content, and form fields stay as
// inline HTML so the AI still knows they are there.

const BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl', 'dd', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main',
  'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
])

const KEPT_AS_HTML = new Set(['input', 'select', 'textarea', 'svg', 'video', 'audio'])

const INLINE_MARKERS = { strong: '**', b: '**', em: '*', i: '*', code: '`', s: '~~', del: '~~' }

const BLOCK_SELECTOR = [...BLOCK_ELEMENTS].join(',')

const isBlock = (node) =>
  node.nodeType === Node.COMMENT_NODE
  || (node.nodeType === Node.ELEMENT_NODE
    && (BLOCK_ELEMENTS.has(node.localName) || node.querySelector(BLOCK_SELECTOR) !== null))

const tidy = (text) => text.replace(/[ \t]+/g, ' ').replace(/ ?\n[\s]*/g, '\n').trim()

const outerHtml = (element) => element.outerHTML.replace(/\s+/g, ' ')

// Block children become lines, so a `div` per line inside a table cell reads as `a<br>b`
const inline = (node) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, ' ')
  if (node.nodeType === Node.COMMENT_NODE) return `\n<!--${node.textContent}-->\n`
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const tag = node.localName
  if (tag === 'br') return '\n'
  if (tag === 'img') return `![${node.getAttribute('alt') ?? ''}](${node.getAttribute('src') ?? ''})`
  if (KEPT_AS_HTML.has(tag)) return outerHtml(node)

  const content = tidy([...node.childNodes].map(inline).join('')) || (node.getAttribute('aria-label') ?? '')
  if (!content) return ''
  if (tag === 'a' && node.hasAttribute('href')) return `[${content}](${node.getAttribute('href')})`
  if (INLINE_MARKERS[tag]) return `${INLINE_MARKERS[tag]}${content}${INLINE_MARKERS[tag]}`
  return BLOCK_ELEMENTS.has(tag) ? `\n${content}\n` : content
}

const cellText = (cell) => tidy(inline(cell)).replace(/\n/g, '<br>').replace(/\|/g, '\\|')

const ownRows = (table) => [...table.querySelectorAll('tr')].filter((row) => row.closest('table') === table)

const table = (element) => {
  const rows = ownRows(element).map((row) =>
    [...row.children].filter((cell) => cell.localName === 'td' || cell.localName === 'th').map(cellText))
  if (rows.length === 0) return ''
  const width = Math.max(...rows.map((cells) => cells.length))
  const line = (cells) => `| ${Array.from({ length: width }, (_, index) => cells[index] ?? '').join(' | ')} |`
  const [header, ...body] = rows

  // Rows dropped by "collapse repeated" leave a comment that can't live inside a Markdown table
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_COMMENT)
  const notes = []
  while (walker.nextNode()) notes.push(`<!--${walker.currentNode.textContent}-->`)

  return [line(header), line(Array(width).fill('---')), ...body.map(line), ...notes].join('\n')
}

const indent = (text, prefix) => text.split('\n').map((line, index) => (index ? ' '.repeat(prefix.length) : prefix) + line).join('\n')

const list = (element) => {
  const items = [...element.children].filter((child) => child.localName === 'li')
  return items
    // Blank lines inside an item would make it a "loose" list with blank-padded nested lists
    .map((item, index) => indent(blocks(item).replace(/\n\n+/g, '\n'), element.localName === 'ol' ? `${index + 1}. ` : '- '))
    .join('\n')
}

const block = (node) => {
  if (node.nodeType === Node.COMMENT_NODE) return `<!--${node.textContent}-->`
  const tag = node.localName
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${tidy(inline(node)).replace(/\n/g, ' ')}`
  if (tag === 'pre') return `\`\`\`\n${node.textContent.replace(/\n$/, '')}\n\`\`\``
  if (tag === 'hr') return '---'
  if (tag === 'table') return table(node)
  if (tag === 'ul' || tag === 'ol') return list(node)
  if (tag === 'blockquote') return blocks(node).split('\n').map((line) => `> ${line}`).join('\n')
  return node.querySelector(BLOCK_SELECTOR) ? blocks(node) : tidy(inline(node))
}

// Consecutive inline nodes form one paragraph; each block child is its own paragraph
const blocks = (element) => {
  const parts = []
  let run = ''
  const flush = () => {
    if (tidy(run)) parts.push(tidy(run))
    run = ''
  }
  for (const child of element.childNodes) {
    if (isBlock(child)) {
      flush()
      const text = block(child)
      if (text) parts.push(text)
    } else run += inline(child)
  }
  flush()
  return parts.join('\n\n')
}

export const toMarkdown = (root) => blocks(root).replace(/\n{3,}/g, '\n\n')
