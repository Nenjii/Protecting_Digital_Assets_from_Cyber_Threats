# CyberChef (bundled copy)

- **What:** CyberChef, "the cyber Swiss army knife", by GCHQ. Apache License 2.0 (`LICENSE`); the bundled libraries' licences are in the `*.LICENSE.txt` files.
- **Version:** v11.5.0, released 18 September 2026.
- **From:** https://github.com/gchq/CyberChef/releases/tag/v11.5.0, file `CyberChef_8cd426dd4f40f1423912d5fad91b578a86a65112.zip`, SHA-256 `f6478925d3eaa16ec08626a85f5b85eed10d531a5e18700615fed7ecb024cccf` (matches the digest GitHub publishes for the release). Downloaded 20 October 2026.
- **Changed:** `CyberChef_v11.5.0.html` renamed to `index.html`; the pre-compressed duplicates (`*.br`, `*.gz`) removed. Nothing else.

CyberChef runs entirely in the browser and works offline. Two optional operations would reach the internet if someone ran them: **Optical Character Recognition** (downloads its language data from a CDN) and **Show on map** (loads map tiles). They are not used in the course; `tools/check-offline.mjs` names them as its only exceptions.

To update: download the new release zip, check its SHA-256 against the release page, replace this folder's contents the same way, and run `npm run build && npm test`.
