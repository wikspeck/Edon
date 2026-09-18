# Edon

Edon is a browser-based professional visual design workspace.

## Development

```bash
npm install
npm run dev
```

## Validation and deployment

```bash
npm run lint
npm run typecheck
npm run build
npm run deploy:dry-run
```

The production SPA is emitted to `dist/` and deployed as Cloudflare Worker static assets through `wrangler.jsonc`.
