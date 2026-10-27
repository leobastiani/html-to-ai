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
- Atributos que repetem o óbvio: `role` igual ao do elemento (`<td role="cell">`), `aria-*` com o valor padrão (`aria-required="false"`, `aria-sort="none"`), `aria-label` igual ao texto, `aria-describedby`/`aria-labelledby` apontando para ids que não existem mais e `href="#"`.
- Classes e `id` sem semântica (`vnskjfndj`, `css-1x2y3z`, `sc-bdVaJa`, `Button_root__a1b2c`) e de bibliotecas de componentes (`ng-star-inserted`, `mat-mdc-cell`, `cdk-row`, `MuiButton-root`), mantendo as com nome de gente (`product-card`, `menuPrincipal`, `btn--primary`, `col-6`). A heurística está em [src/isSemanticName.js](src/isSemanticName.js).
- `data:` URIs são truncadas e URLs muito longas são cortadas.
- Elementos vazios.

## Opções

- **Remover `div`/`span`/componentes que só embrulham** (ligada): `span`, `a` e custom elements (`mat-card`, `fire-search-bar`) sem atributos dão lugar ao conteúdo; `div` sem atributos com um único filho dá lugar ao filho.
- **Remover ocultos** (ligada): elementos com `aria-hidden="true"` ou `hidden` (ícones, ligaduras como `more_vert`).
- **Remover classes e ids**: quando só o conteúdo importa.
- **Remover botões e campos**: `button`, `input`, `select`, `textarea`, comboboxes e menus.
- **Encurtar listas**: mantém os 3 primeiros irmãos de cada tag (exceto células de tabela) e troca o resto por `<!-- 13 more <tr> -->`, suficiente para a IA entender a estrutura.
- **Indentar** (ligada).

## Desenvolvimento

```sh
pnpm install
pnpm dev    # serve a página localmente
pnpm test
pnpm lint
```

O deploy no GitHub Pages acontece a cada push na `main` (ver [.github/workflows/pages.yml](.github/workflows/pages.yml)).
