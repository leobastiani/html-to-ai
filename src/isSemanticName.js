// Heuristic to tell human-written names (`product-card`, `menuItem`, `botao-comprar`, `col-6`)
// apart from generated ones (`vnskjfndj`, `css-1x2y3z`, `sc-bdVaJa`, `Button_root__a1b2c`).
// A name is semantic only if every part of it looks like a word, a small number or a short
// size token (`h1`, `2xl`, `200px`), so a single hashed part rejects the whole name.

const GENERATED_PREFIX = /^(css|sc|jsx|emotion|svelte|astro|ng-tns|ng-c|ember|chakra|mui-\d)[-_]/i
const VOWELS = /[aeiouyáàâãéêíóôõúü]/i
const CONSONANT_RUN = /[^aeiouyáàâãéêíóôõúü\d]{5,}/i
const WORD = /^([A-Z]?[a-zà-ÿ]+|[A-Z]{2,})$/
const SMALL_NUMBER = /^\d{1,3}$/
const SIZE_TOKEN = /^([a-z]{1,2}\d{1,2}|\d{1,3}[a-z]{1,3})$/i

const splitParts = (name) =>
  name
    .split(/[^A-Za-z0-9à-ÿÀ-ß]+/)
    .flatMap((chunk) => chunk.split(/(?<=[a-zà-ÿ])(?=[A-Z])/))
    .filter(Boolean)

const isWordLike = (part) => {
  if (!WORD.test(part)) return false
  if (part.length <= 3) return true
  if (!VOWELS.test(part)) return false
  return !CONSONANT_RUN.test(part)
}

export const isSemanticName = (name) => {
  if (GENERATED_PREFIX.test(name)) return false
  const parts = splitParts(name)
  if (parts.length === 0) return false
  if (!parts.every((part) => SMALL_NUMBER.test(part) || SIZE_TOKEN.test(part) || isWordLike(part)))
    return false
  // Hashes like `bdVaJa` split into many tiny "words"; real camelCase/kebab names rarely do
  const tinyParts = parts.filter((part) => /^[A-Za-z]{1,2}$/.test(part)).length
  return !(parts.length >= 3 && tinyParts > parts.length / 2)
}
