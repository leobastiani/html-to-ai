import { expect, test } from 'vitest'

import { cleanHtml } from './cleanHtml.js'

test('turns a messy copied page into lean HTML an AI can read', () => {
  const html = `
    <html><head><title> Loja </title><style>.a{}</style><script>track()</script></head>
    <body>
      <!-- header -->
      <div class="vnskjfndj css-1x2y3z">
        <div class="sc-bdVaJa">
          <nav id="main-nav" class="menu menuPrincipal" style="color:red" data-v-7ba5bd90 jsaction="click:x">
            <a href="/produtos" onclick="go()" class="link Button_root__a1b2c" tabindex="0">Produtos</a>
            <a href="javascript:void(0)" aria-label="Carrinho"><svg viewBox="0 0 24 24"><path d="M1 2"/></svg></a>
          </nav>
        </div>
      </div>
      <span class="_3xYz"></span>
      <ul class="product-list col-6">
        <li class="card" data-testid="product" data-id="9f8e7d">
          <img src="data:image/png;base64,iVBORw0KGgo=" srcset="a.png 2x" alt="Sneakers" loading="lazy">
          <h2 class="card__title">Sneakers   blue</h2>
          <button type="button" class="btn btn--primary mt-4 kXPqIm" disabled>Comprar</button>
        </li>
      </ul>
      <pre class="code">  keep
    spacing</pre>
    </body></html>
  `

  expect(cleanHtml(html)).toBe(`<title>Loja</title>
<nav id="main-nav" class="menu menuPrincipal">
  <a href="/produtos" class="link">Produtos</a>
  <a aria-label="Carrinho">
    <svg></svg>
  </a>
</nav>
<ul class="product-list col-6">
  <li class="card" data-testid="product">
    <img src="data:image/png;base64,…" alt="Sneakers">
    <h2 class="card__title">Sneakers blue</h2>
    <button type="button" class="btn btn--primary mt-4" disabled>Comprar</button>
  </li>
</ul>
<pre class="code">  keep
    spacing</pre>`)

  // Compact mode keeps spacing between inline siblings and wrappers when unwrap is off
  expect(cleanHtml('<div><p>Hello <b>world</b>!</p></div>', { unwrap: false, pretty: false }))
    .toBe('<div><p>Hello <b>world</b>!</p></div>')
})

test('slims a component-library table down to its data', () => {
  const row = (path) => `
    <tr role="row" class="mat-mdc-row cdk-row fire-table-row ng-star-inserted">
      <td role="cell" class="mat-mdc-cell resource-name-cell ng-star-inserted">
        <a href="#" class="data-text-wrapper" aria-describedby="cdk-describedby-message-ng-1-180"><span class="ng-star-inserted">api.wellz.com${path}</span></a>
      </td>
      <td role="cell" class="mat-mdc-cell metric-value-cell"><a href="#" aria-label="100%"><span>100%</span></a></td>
      <td role="cell" class="metric-actions-cell">
        <fireperf-favorite-icons><button aria-label="Favorite ${path}"><mat-icon aria-hidden="true">more_vert</mat-icon></button></fireperf-favorite-icons>
      </td>
    </tr>`
  const html = `
    <mat-card class="mat-mdc-card ng-star-inserted">
      <table role="table" class="mat-mdc-table cdk-table fire-table">
        <thead role="rowgroup"><tr role="row">
          <th role="columnheader" aria-sort="none"><div role="button" class="mat-sort-header-container"><span>Network request</span></div></th>
          <th role="columnheader" aria-sort="descending"><div role="button"><span aria-label="Success rate">Success</span></div></th>
          <th role="columnheader">Actions</th>
        </tr></thead>
        <tbody role="rowgroup">${['/a', '/b', '/c', '/d', '/e'].map(row).join('')}</tbody>
      </table>
      <mat-select role="combobox" aria-expanded="false" aria-required="false"><span>25</span></mat-select>
    </mat-card>
  `

  // Library classes, implicit roles, default aria values and dead references go by default
  expect(cleanHtml(html)).toContain(`<table class="fire-table">
  <thead>
    <tr>
      <th>
        <div role="button">Network request</div>
      </th>
      <th aria-sort="descending">
        <div role="button">
          <span aria-label="Success rate">Success</span>
        </div>
      </th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr class="fire-table-row">
      <td class="resource-name-cell">
        <a class="data-text-wrapper">api.wellz.com/a</a>
      </td>
      <td class="metric-value-cell">100%</td>
      <td class="metric-actions-cell">
        <button aria-label="Favorite /a"></button>
      </td>
    </tr>`)

  expect(cleanHtml(html, { removeClasses: true, removeControls: true, collapseRepeated: true })).toBe(`<table>
  <thead>
    <tr>
      <th>
        <div role="button">Network request</div>
      </th>
      <th aria-sort="descending">
        <div role="button">
          <span aria-label="Success rate">Success</span>
        </div>
      </th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>api.wellz.com/a</td>
      <td>100%</td>
      <td></td>
    </tr>
    <tr>
      <td>api.wellz.com/b</td>
      <td>100%</td>
      <td></td>
    </tr>
    <tr>
      <td>api.wellz.com/c</td>
      <td>100%</td>
      <td></td>
    </tr>
    <!-- 2 more <tr> -->
  </tbody>
</table>`)
})

test('outputs Markdown when the user picks it', () => {
  const html = `
    <html><head><title>Docs</title></head><body>
      <h1 class="css-1x2y3z">Guia</h1>
      <p>Read the <a href="/manual">manual</a> with <strong>care</strong>.<br>Then run <code>pnpm dev</code>.</p>
      <ul>
        <li>Primeiro</li>
        <li>Segundo <ol><li>sub</li></ol></li>
      </ul>
      <table>
        <tr><th>Rota</th><th>Tempo</th></tr>
        <tr><td><div>api/a|b</div><div>3 samples</div></td><td>10 ms</td></tr>
        <tr><td>api/c</td><td><button aria-label="Favoritar"></button></td></tr>
      </table>
      <form><input type="search" placeholder="Buscar"></form>
      <pre>  x = 1
</pre>
    </body></html>
  `

  expect(cleanHtml(html, { format: 'markdown' })).toBe(`# Docs

# Guia

Read the [manual](/manual) with **care**.
Then run \`pnpm dev\`.

- Primeiro
- Segundo
  1. sub

| Rota | Tempo |
| --- | --- |
| api/a\\|b<br>3 samples | 10 ms |
| api/c | Favoritar |

<input type="search" placeholder="Buscar">

\`\`\`
  x = 1
\`\`\``)
})
