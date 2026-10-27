# html-to-ai

Static page (GitHub Pages) that slims down HTML copied from a web page before pasting it into an AI (Claude Code, etc.).

**Try it:** https://leobastiani.github.io/html-to-ai/

## How to use

1. Copy the page's HTML: in DevTools, right-click the element → *Copy* → *Copy outerHTML*; or just select a part of the rendered page and copy it (the page uses the clipboard's `text/html`).
2. Paste it into the left pane.
3. Click **Copy** in the right pane and paste the result into the AI.

Everything runs in the browser, nothing is sent to any server.

## What is removed

- `script`, `style`, `noscript`, `template`, `link`, `meta`, `iframe`, `canvas`, ... and HTML comments.
- `svg` content (only `<svg>` with its useful attributes remains).
- Attributes that don't help the AI: `style`, `on*`, `data-*`, `tabindex`, `srcset`, `jsaction`, ... Only an allowlist is kept (`href`, `src`, `alt`, `role`, `aria-*`, `type`, `name`, `data-testid`, ...). See `KEPT_ATTRIBUTES` in [src/cleanHtml.js](src/cleanHtml.js).
- Attributes that state the obvious: `role` equal to the element's own (`<td role="cell">`), `aria-*` with the default value (`aria-required="false"`, `aria-sort="none"`), `aria-label` equal to the text, `aria-describedby`/`aria-labelledby` pointing to ids that no longer exist, and `href="#"`.
- Classes and `id`s with no meaning (`vnskjfndj`, `css-1x2y3z`, `sc-bdVaJa`, `Button_root__a1b2c`) and those from component libraries (`ng-star-inserted`, `mat-mdc-cell`, `cdk-row`, `MuiButton-root`), keeping human-readable names (`product-card`, `mainMenu`, `btn--primary`, `col-6`). The heuristic lives in [src/isSemanticName.js](src/isSemanticName.js).
- `data:` URIs are truncated and very long URLs are cut.
- Empty elements.

## Options

- **Format**: `HTML` (default) or `Markdown`. Markdown is generated from the already cleaned HTML (respecting the other options): headings, lists, links, emphasis, `code`/`pre` and tables become Markdown; `div`/`span`/components keep only their content; form fields and `svg` stay as inline HTML. See [src/toMarkdown.js](src/toMarkdown.js).
- **Remove `div`/`span`/components that only wrap** (on): `span`, `a` and custom elements (`mat-card`, `fire-search-bar`) without attributes are replaced by their content; a `div` without attributes and with a single child is replaced by that child.
- **Remove hidden** (on): elements with `aria-hidden="true"` or `hidden` (icons, ligatures like `more_vert`).
- **Remove classes and ids**: when only the content matters.
- **Remove buttons and fields**: `button`, `input`, `select`, `textarea`, comboboxes and menus.
- **Shorten lists**: keeps the first 3 siblings of each tag (except table cells) and replaces the rest with `<!-- 13 more <tr> -->`, enough for the AI to understand the structure.
- **Indent HTML** (on).

## Development

```sh
pnpm install
pnpm dev    # serves the page locally
pnpm test
pnpm lint
```

Deployment to GitHub Pages happens on every push to `main` (see [.github/workflows/pages.yml](.github/workflows/pages.yml)). Static SEO files (`robots.txt`, `sitemap.xml`) live in [public/](public/) and are copied to the site root on deploy.
