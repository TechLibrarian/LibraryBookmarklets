# Dev harness

The scripts in the repository root are browser **bookmarklets** — client-only
`javascript:` snippets that run against live library web apps (Ex Libris Alma,
SILO ILL). There is no build step or package manager; you edit a `.js` file and
run it in a browser.

This folder provides a local harness so the Alma-facing bookmarklets can be
exercised without access to the production sites.

## Running

A static file server is started automatically by the Cloud Agent environment
(`.cursor/environment.json`) on port `8000`. To run it manually from the repo
root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/dev/> and use the blue **Bookmarklet runner**
toolbar to execute a script against the current mock page.

## Pages

| Page | Exercises |
| --- | --- |
| `index.html` | Hub + the `calculator.js` overlay (works on any page) |
| `alma-cataloging.html` | `1BigCatMenu.js`, `2RepeatCataloging.js` |
| `alma-batch-update.html` | `NewToOldMenu.js` |

`runner.js` fetches a bookmarklet's source and evaluates it on the page, exactly
as clicking the installed bookmarklet would. The mock pages recreate the Alma
element IDs the scripts look for and populate their `<select>` options from the
codes referenced in each script's data tables.

The SILO ILL helpers (`ILLCart.js`, `ILLSearch.js`) target external ILL/OPAC
sites and are not covered by this harness.
