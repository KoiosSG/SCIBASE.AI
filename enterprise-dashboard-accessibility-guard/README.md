# Enterprise Dashboard Accessibility Guard

Self-contained Enterprise Tooling slice for issue #19.

This module evaluates institutional admin dashboard releases before they are shown to admins, included in scheduled exports, or summarized through webhook notices. It uses synthetic dashboard records only and does not call external accessibility scanners, SSO providers, webhook endpoints, or private institutional systems.

## What It Checks

- Critical metric color contrast and warning-level contrast checks for noncritical content
- Invalid or unparseable contrast evidence, including unresolved CSS color tokens
- Missing screen-reader labels
- Keyboard reachability and focus traps
- Missing visible focus indicators for keyboard-reachable dashboard controls
- Private user or project data embedded in screen-reader labels, table summaries, or export summaries
- Missing table and export summaries
- Heading-order skips
- Missing reduced-motion fallbacks for animated dashboard content

## Commands

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

`npm run demo` writes JSON, Markdown, and SVG reviewer artifacts under `reports/`. `npm run demo:video` renders a short local MP4 walkthrough.

## Safety

- Synthetic sample data only
- No private dashboard data, SSO records, webhook calls, or network access
- No credentials, tokens, payment details, or institutional secrets
- Release decisions are guard outputs, not production enforcement actions
