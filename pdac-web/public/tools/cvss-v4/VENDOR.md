# CVSS v4.0 calculator (bundled copy)

- **What:** the CVSS v4.0 calculator by FIRST.ORG, Red Hat and contributors, the same calculator FIRST publishes. BSD 2-Clause licence (`LICENSE`).
- **From:** https://github.com/RedHatProductSecurity/cvss-v4-calculator, branch `main` as of 16 September 2026. Downloaded 20 October 2026.
- **Libraries, now local** (`vendor/`): Vue 3.2.45 (`vue.global.prod.js`, MIT) and spectre.css 0.5.9 (MIT), taken from the npm registry; both tarballs matched the registry's published SHA-512 integrity.
- **Changed:** `index.html` loads those local copies instead of unpkg.com, and shows the text "CVSS v4.0" instead of the logo image from first.org; one style line added to `styles.css` for that text. The scoring code (`cvss40.js`, `app.js`, `metrics.json`) is unchanged.

Open it with a vector after `#` to pre-fill it, for example `index.html#CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`.
