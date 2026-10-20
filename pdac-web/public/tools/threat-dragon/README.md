# OWASP Threat Dragon models (Module 2)

Two models of the course's fictional RSSO, made by `npm run threat-dragon` from the presentation's own data:

| File | What it is |
|---|---|
| `rsso-booking-page.json` | The learner guide's worked example: citizen and staff, two steps, the appointments list, both trust boundaries, and the guide's three STRIDE threats with their controls. Built from `src/data/m2-booking-dfd.json`, so it matches the slide. |
| `rsso-portal-starter.json` | The graded risk assessment's starter list only: four outside parties, four steps, three data stores. Teams draw the flows and boundaries and add at least 8 threats. |

**Open them:** install OWASP Threat Dragon 2.6.2 (free, Apache 2.0) from https://github.com/OWASP/threat-dragon/releases/tag/v2.6.2 (desktop app for Windows, macOS or Linux; works offline). In the app: **Open an existing threat model** → choose the file → open the diagram.

**In class:** on the `worked-map` slide, press **I** (IT depth) for the download link. Show the same map in the tool, open a red element to see its threats, then add one more threat live. On `ra-map`, IT-minded teams may start from the starter model; paper or a shared document stays the default.

The models follow Threat Dragon's v2 format, checked against the app's own schema (v2.6.2). Like the app's bundled demo models, they store `strokeDasharray: null` for solid lines.
