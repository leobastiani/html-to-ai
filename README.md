# html-to-ai

Página estática (GitHub Pages) para enxugar o HTML copiado de uma página antes de colar numa IA (Claude Code, etc.).

**Acesse:** https://leobastiani.github.io/html-to-ai/

## Como usar

1. Copie o HTML da página: no DevTools, botão direito no elemento → *Copy* → *Copy outerHTML*; ou simplesmente selecione um trecho da página renderizada e copie (a página usa o `text/html` da área de transferência).
2. Cole no painel da esquerda.
3. Clique em **Copiar** no painel da direita e cole na IA.

Tudo roda no navegador, nada é enviado para servidor nenhum.

## O que é removido

- `script`, `style`, `noscript`, `template`, `link`, `meta`, `iframe`, `canvas`, ... e comentários HTML.
- Conteúdo de `svg` (fica só `<svg>` com seus atributos úteis).
- Atributos que não ajudam a IA: `style`, `on*`, `data-*`, `tabindex`, `srcset`, `jsaction`, ... Ficam só os de uma allowlist (`href`, `src`, `alt`, `role`, `aria-*`, `type`, `name`, `data-testid`, ...). Ver `KEPT_ATTRIBUTES` em [src/cleanHtml.js](src/cleanHtml.js).
- Classes e `id` sem semântica (`vnskjfndj`, `css-1x2y3z`, `sc-bdVaJa`, `Button_root__a1b2c`), mantendo as com nome de gente (`product-card`, `menuPrincipal`, `btn--primary`, `col-6`). A heurística está em [src/isSemanticName.js](src/isSemanticName.js).
- `data:` URIs são truncadas e URLs muito longas são cortadas.
- Elementos vazios e, opcionalmente, `div`/`span` sem atributos que só embrulham um único filho.

## Desenvolvimento

```sh
pnpm install
pnpm dev    # serve a página localmente
pnpm test
pnpm lint
```

O deploy no GitHub Pages acontece a cada push na `main` (ver [.github/workflows/pages.yml](.github/workflows/pages.yml)).
