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
          <img src="data:image/png;base64,iVBORw0KGgo=" srcset="a.png 2x" alt="Tênis" loading="lazy">
          <h2 class="card__title">Tênis   azul</h2>
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
    <img src="data:image/png;base64,…" alt="Tênis">
    <h2 class="card__title">Tênis azul</h2>
    <button type="button" class="btn btn--primary mt-4" disabled>Comprar</button>
  </li>
</ul>
<pre class="code">  keep
    spacing</pre>`)

  // Compact mode keeps spacing between inline siblings and wrappers when unwrap is off
  expect(cleanHtml('<div><p>Olá <b>mundo</b>!</p></div>', { unwrap: false, pretty: false }))
    .toBe('<div><p>Olá <b>mundo</b>!</p></div>')
})
