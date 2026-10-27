import { isSemanticName } from './isSemanticName.js'
import { toMarkdown } from './toMarkdown.js'

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

const HIDDEN_ELEMENTS = '[aria-hidden="true"], [hidden]'

// `[role="button"]` stays: libraries use it for things with content, like sortable table headers
const CONTROL_ELEMENTS = 'button, input, select, textarea, [role="combobox"], [role="listbox"], [role="menu"]'

// A `role` equal to the element's own role says nothing new (`<td role="cell">`)
const IMPLICIT_ROLES = {
  a: 'link', article: 'article', aside: 'complementary', button: 'button', dialog: 'dialog', form: 'form',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', hr: 'separator',
  img: 'img', li: 'listitem', main: 'main', nav: 'navigation', ol: 'list', option: 'option', table: 'table',
  tbody: 'rowgroup', td: 'cell', textarea: 'textbox', tfoot: 'rowgroup', th: 'columnheader', thead: 'rowgroup',
  tr: 'row', ul: 'list',
}

// Values that are already the default, unlike `aria-expanded="false"` which is a state
const ARIA_DEFAULTS = {
  'aria-atomic': 'false', 'aria-busy': 'false', 'aria-disabled': 'false', 'aria-haspopup': 'false',
  'aria-hidden': 'false', 'aria-invalid': 'false', 'aria-live': 'off', 'aria-multiselectable': 'false',
  'aria-readonly': 'false', 'aria-required': 'false', 'aria-sort': 'none',
}

const ID_REFERENCES = [
  'aria-activedescendant', 'aria-controls', 'aria-describedby', 'aria-details', 'aria-errormessage',
  'aria-flowto', 'aria-labelledby', 'aria-owns', 'for',
]

const MAX_URL_LENGTH = 200

const keepsAttribute = (name) => KEPT_ATTRIBUTES.has(name) || name.startsWith('aria-')

const cleanUrl = (url) => {
  if (/^\s*javascript:/i.test(url)) return null
  if (url === '' || url === '#') return null
  if (url.startsWith('data:')) return `${url.slice(0, url.indexOf(',') + 1)}…`
  return url.length > MAX_URL_LENGTH ? `${url.slice(0, MAX_URL_LENGTH)}…` : url
}

const isNoise = (element, name, value) =>
  !keepsAttribute(name)
  || ARIA_DEFAULTS[name] === value
  || (name === 'role' && IMPLICIT_ROLES[element.localName] === value)

const cleanAttributes = (element, options) => {
  for (const { name, value } of [...element.attributes]) {
    if (isNoise(element, name, value) || (options.removeClasses && (name === 'class' || name === 'id'))) {
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

const normalizeText = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase()

// Runs after the cleanup of ids, so references to ids that were dropped go away too
const pruneAria = (root) => {
  const ids = new Set([...root.querySelectorAll('[id]')].map((element) => element.id))
  for (const element of root.querySelectorAll('*')) {
    for (const name of ID_REFERENCES) {
      const value = element.getAttribute(name)
      if (value === null) continue
      const existing = value.split(/\s+/).filter((id) => ids.has(id))
      if (existing.length) element.setAttribute(name, existing.join(' '))
      else element.removeAttribute(name)
    }
    const label = element.getAttribute('aria-label')
    if (label !== null && normalizeText(label) === normalizeText(element.textContent))
      element.removeAttribute('aria-label')
  }
}

const isBlank = (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()

const MEANINGFUL_WHEN_EMPTY_SELECTOR = [...MEANINGFUL_WHEN_EMPTY].join(',')

const hasMeaningfulContent = (element) =>
  Boolean(element.textContent.trim())
  || element.hasAttribute('aria-label')
  || element.querySelector(MEANINGFUL_WHEN_EMPTY_SELECTOR) !== null

// Without attributes these are pure presentation, so their content can take their place
const INLINE_WRAPPERS = new Set(['span', 'a'])
const isCustomElement = (tag) => tag.includes('-')

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

  if (!options.unwrap || element.attributes.length > 0) return

  if (INLINE_WRAPPERS.has(tag) || isCustomElement(tag)) {
    const parent = element.parentNode
    element.replaceWith(...element.childNodes)
    parent.normalize()
    return
  }
  if (tag === 'div') {
    const meaningfulChildren = [...element.childNodes].filter((node) => !isBlank(node))
    if (meaningfulChildren.length === 1 && meaningfulChildren[0].nodeType === Node.ELEMENT_NODE)
      element.replaceWith(meaningfulChildren[0])
  }
}

const MAX_REPEATED = 3

// Table cells are columns, not repetitions of the same item
const NEVER_COLLAPSED = new Set(['td', 'th', 'col'])

// Keeps the first siblings of each tag, enough for the AI to see the structure of a list
const collapseRepeated = (root) => {
  for (const element of [root, ...root.querySelectorAll('*')]) {
    const byTag = Map.groupBy(element.children, (child) => child.localName)
    for (const [tag, siblings] of byTag) {
      if (NEVER_COLLAPSED.has(tag) || siblings.length <= MAX_REPEATED) continue
      const omitted = siblings.slice(MAX_REPEATED)
      siblings[MAX_REPEATED - 1].after(root.ownerDocument.createComment(` ${omitted.length} more <${tag}> `))
      omitted.forEach((sibling) => sibling.remove())
    }
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
  if (node.nodeType === Node.COMMENT_NODE) return `${indent}<!--${node.textContent}-->${newline}`
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

export const DEFAULT_OPTIONS = {
  unwrap: true,
  removeHidden: true,
  removeClasses: false,
  removeControls: false,
  collapseRepeated: false,
  pretty: true,
  // `html` or `markdown`
  format: 'html',
}

export const cleanHtml = (html, overrides = {}) => {
  const options = { ...DEFAULT_OPTIONS, ...overrides }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = doc.title.trim()

  const removed = [
    REMOVED_ELEMENTS,
    ...(options.removeHidden ? [HIDDEN_ELEMENTS] : []),
    ...(options.removeControls ? [CONTROL_ELEMENTS] : []),
  ]
  doc.body.querySelectorAll(removed.join(', ')).forEach((element) => element.remove())
  removeComments(doc.body)
  doc.body.querySelectorAll('*').forEach((element) => cleanAttributes(element, options))
  pruneAria(doc.body)
  for (const child of [...doc.body.children]) simplify(child, options)
  if (options.collapseRepeated) collapseRepeated(doc.body)

  if (options.format === 'markdown') return `${title ? `# ${title}\n\n` : ''}${toMarkdown(doc.body)}`.trim()

  const body = [...doc.body.childNodes].map((node) => serialize(node, options)).join('')
  const titleLine = title ? serialize(Object.assign(doc.createElement('title'), { textContent: title }), options) : ''
  return `${titleLine}${body}`.trim()
}
