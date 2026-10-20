# Fallback clips

Every live demo needs a recorded fallback (spec section 2, constraint 7). Press **F** on a demo slide to play it.
The viewer tries `<name>.mp4` first, then `<name>.png`, then says what is missing.

| File name | Slide | What to record (about 60 seconds) |
|---|---|---|
| `credentials.mp4` | Module 1 · `credentials` | Content Credentials Verify: a signed sample image, then a screenshot of it showing no credentials |
| `scamcheck.mp4` | Module 2 · `phish-2` | ScamCheck.ph checking one fictional message (no names, numbers or OTPs) |

Planned for later modules (add a `data-demo="<name>"` attribute to the slide):

| File name | Module | What to record |
|---|---|---|
| `pwned-passwords.mp4` | 3 · 3.3 | Pwned Passwords with invented passwords only |
| `observatory.mp4` | 4 (optional) | MDN HTTP Observatory scanning the online lab only |
| `threat-dragon.mp4` | 2.2 (optional) | OWASP Threat Dragon demo, shown only |

Use your own sample files and fictional messages only. Rebuild after adding files (`npm run build`).
