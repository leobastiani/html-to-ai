import { isSemanticName } from './isSemanticName.js'

const REMOVED_ELEMENTS = 'script, style, noscript, template, link, meta, base, iframe, object, embed, canvas'

const KEPT_ATTRIBUTES = new Set([
  'id', 'class', 'href', 'src', 'alt', 'title', 'name', 'type', 'value', 'placeholder', 'for',
  'action', 'method', 'role', 'lang', 'datetime', 'colspan', 'rowspan', 'label', 'checked',
  'disabled', 'selected', 'required', 'readonly', 'multiple', 'open',
  'data-testid', 'data-test', 'data-test-id', 'data-cy', 'data-qa',
])

const VOID_ELEMENTS = new Set([
  'area', 'br', 'col', 'hr', 'img', 'input', 'source', 'track', 'wbr',
])

// Elements that mean something even without text inside
const MEANINGFUL_WHEN_EMPTY = new Set([
  ...VOID_ELEMENTS, 'svg', 'textarea', 'select', 'button', 'video', 'audio', 'picture', 'td', 'th',
])

const PRESERVE_WHITESPACE = new Set(['pre', 'textarea'])

const MAX_URL_LENGTH = 200

const keepsAttribute = (name) => KEPT_ATTRIBUTES.has(name) || name.startsWith('aria-')

const cleanUrl = (url) => {
  if (/^\s*javascript:/i.test(url)) return null
  if (url.startsWith('data:')) return `${url.slice(0, url.indexOf(',') + 1)}…`
  return url.length > MAX_URL_LENGTH ? `${url.slice(0, MAX_URL_LENGTH)}…` : url
}

const cleanAttributes = (element) => {
  for (const { name, value } of [...element.attributes]) {
    if (!keepsAttribute(name)) {
      element.removeAttribute(name)
      continue
    }
    if (name === 'class') {
      const semantic = value.split(/\s+/).filter((token) => token && isSemanticName(token))
      if (semantic.length) element.setAttribute('class', semantic.join(' '))
      else element.removeAttribute('class')
    } else if (name === 'id') {
      if (!isSemanticName(value)) element.removeAttribute('id')
    } else if (name === 'href' || name === 'src') {
      const url = cleanUrl(value)
      if (url === null) element.removeAttribute(name)
      else element.setAttribute(name, url)
    }
  }
}

const removeComments = (root) => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
  const comments = []
  while (walker.nextNode()) comments.push(walker.currentNode)
  comments.forEach((comment) => comment.remove())
}

const isBlank = (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()

const MEANINGFUL_WHEN_EMPTY_SELECTOR = [...MEANINGFUL_WHEN_EMPTY].join(',')

const hasMeaningfulContent = (element) =>
  Boolean(element.textContent.trim())
  || element.hasAttribute('aria-label')
  || element.querySelector(MEANINGFUL_WHEN_EMPTY_SELECTOR) !== null

const GENERIC_WRAPPERS = new Set(['div', 'span'])

// Children first, so wrappers emptied by their children are handled on the way up
const simplify = (element, options) => {
  for (const child of [...element.children]) simplify(child, options)

  const tag = element.localName
  if (tag === 'svg') {
    element.replaceChildren()
    return
  }
  if (PRESERVE_WHITESPACE.has(tag)) return

  if (!MEANINGFUL_WHEN_EMPTY.has(tag) && !hasMeaningfulContent(element)) {
    element.remove()
    return
  }

  if (options.unwrap && GENERIC_WRAPPERS.has(tag) && element.attributes.length === 0) {
    const meaningfulChildren = [...element.childNodes].filter((node) => !isBlank(node))
    if (meaningfulChildren.length === 1 && meaningfulChildren[0].nodeType === Node.ELEMENT_NODE)
      element.replaceWith(meaningfulChildren[0])
  }
}

const escapeText = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttribute = (text) => escapeText(text).replace(/"/g, '&quot;')

const serializeAttributes = (element) =>
  [...element.attributes]
    .map(({ name, value }) => (value === '' ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`))
    .join('')

const serialize = (node, options, depth = 0, preserveWhitespace = false) => {
  const indent = options.pretty ? '  '.repeat(depth) : ''
  const newline = options.pretty ? '\n' : ''

  if (node.nodeType === Node.TEXT_NODE) {
    if (preserveWhitespace) return escapeText(node.textContent)
    // Compact output keeps the single space between inline siblings (`Hello <b>world</b>`)
    const collapsed = node.textContent.replace(/\s+/g, ' ')
    const text = options.pretty ? collapsed.trim() : collapsed
    return text.trim() ? `${indent}${escapeText(text)}${newline}` : ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const tag = node.localName
  const open = `<${tag}${serializeAttributes(node)}>`
  if (VOID_ELEMENTS.has(tag)) return `${indent}${open}${newline}`

  const preserve = preserveWhitespace || PRESERVE_WHITESPACE.has(tag)
  const children = [...node.childNodes].filter((child) => preserve || !isBlank(child))
  const close = `</${tag}>`

  if (preserve) {
    const inner = children.map((child) => serialize(child, { pretty: false }, 0, true)).join('')
    return `${indent}${open}${inner}${close}${newline}`
  }
  if (children.every((child) => child.nodeType === Node.TEXT_NODE)) {
    const text = children.map((child) => child.textContent).join('').replace(/\s+/g, ' ').trim()
    return `${indent}${open}${escapeText(text)}${close}${newline}`
  }
  const inner = children.map((child) => serialize(child, options, depth + 1)).join('')
  return `${indent}${open}${newline}${inner}${indent}${close}${newline}`
}

export const DEFAULT_OPTIONS = { unwrap: true, pretty: true }

export const cleanHtml = (html, options = DEFAULT_OPTIONS) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = doc.title.trim()

  doc.body.querySelectorAll(REMOVED_ELEMENTS).forEach((element) => element.remove())
  removeComments(doc.body)
  doc.body.querySelectorAll('*').forEach(cleanAttributes)
  for (const child of [...doc.body.children]) simplify(child, options)

  const body = [...doc.body.childNodes].map((node) => serialize(node, options)).join('')
  const titleLine = title ? serialize(Object.assign(doc.createElement('title'), { textContent: title }), options) : ''
  return `${titleLine}${body}`.trim()
}
