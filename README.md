# Edon

Edon is a browser-based professional visual design workspace.

Edon also contains a versioned, agent-friendly application service and OpenAPI contract for future external integrations. The network API and MCP endpoint are intentionally not exposed yet because the current product stores data only in the browser and has no server identity provider. See [Public API](docs/api/README.md) and [ChatGPT/MCP readiness](docs/integrations/README.md).

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
npm run test:api
npm run validate:openapi
npm run check
npm run deploy:dry-run
```

The production SPA is emitted to `dist/` and deployed as Cloudflare Worker static assets through `wrangler.jsonc`.
