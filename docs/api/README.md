# Edon Public API v1

Edon's public contract is implemented today as a framework-neutral TypeScript application service. It operates on the same `EdonProject`, `EdonDocument`, `EdonPage`, and `EdonElement` models used by the editor. It is not mounted as a network endpoint yet: the current production app is a static SPA and all user data exists only in that browser's `localStorage`.

This boundary is deliberate. A remote API cannot truthfully access browser-local data, and publishing one before server persistence and identity exist would either expose no real data or create a second, divergent product.

## Architecture

```text
ChatGPT / MCP / external client (future)
  -> HTTP or MCP adapter (future server runtime)
  -> OAuth token validation + request ID + rate limiter
  -> EdonPublicApiService (implemented)
  -> PublicApiRepository + per-resource authorization (implemented interface)
  -> server database/object storage (future) or browser-local adapter (implemented)
  -> existing Edon models and constructors
```

Important files:

- `openapi/edon-public-api.v1.json` — OpenAPI 3.1 contract.
- `src/integrations/public-api/contract.ts` — shared types, scopes, and central limits.
- `src/integrations/public-api/service.ts` — validation, authorization, concurrency, idempotency, search, and atomic batches.
- `src/integrations/public-api/repository.ts` — storage and authorization adapter boundary.
- `src/integrations/public-api/client.ts` — UI-independent typed HTTP client for the future host.
- `src/integrations/public-api/host-contracts.ts` — token verification, feature flag, rate-limit, audit, and privacy-conscious logging ports for that host.
- `src/integrations/chatgpt/tools.ts` — compact MCP/ChatGPT tool mapping and safety annotations.

## Current resource model

Edon projects are folders containing document IDs. An Edon document is the editable design. Its pages map to slides and its elements already have stable IDs, parent IDs, transforms, paint, text, image references, visibility, locking, and deterministic layer order.

The public vocabulary therefore uses both `/projects` and `/documents`; it does not rename a document to a project or hide the existing distinction.

Every project and document has a monotonic `revision`. Writes require `ifMatchRevision`; stale writes return `CONFLICT`. Editor commits, undo, and redo also advance the document revision.

## Authentication and authorization

The service accepts an already verified `ApiPrincipal` with a subject, client ID, and scopes. It does not parse or mint credentials. The future network adapter must use an established OAuth 2.1 provider with authorization code + PKCE and validate issuer, audience, expiry, revocation, and scopes on every request.

Scopes currently defined:

- `projects:read`, `projects:write`
- `documents:read`, `documents:write`
- reserved for server-backed features: `assets:read`, `assets:write`, `exports:create`

The repository resolves an owner/editor/viewer role for every resource operation. Unauthorized resource IDs return the same not-found result as absent IDs, reducing ID enumeration and IDOR leakage. The browser adapter recognizes only the local browser subject. A production adapter must resolve ownership and sharing from server-side records.

## Errors, request IDs, and logging

Errors use the stable envelope in OpenAPI:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "The resource has changed. Fetch it again and retry with the latest revision.",
    "requestId": "req_...",
    "details": { "expectedRevision": 3, "actualRevision": 4 }
  }
}
```

The future HTTP adapter must assign `X-Request-ID`, pass it into the service, and log only request ID, operation ID, status, latency, client ID, a one-way/pseudonymous user identifier, and error code. It must never log bearer tokens, raw document bodies, image data URLs, passwords, or secrets.

## Pagination, partial responses, and search

Collections return `{ items, nextCursor }`, default to 25 records, and cap at 100. List operations intentionally return scoped collections; the future HTTP presenter should serialize document summaries for `listDocuments` even though the internal service retains the full model. Search covers accessible project names/descriptions, document names, slide names, element names, and text, returning stable IDs and short snippets.

`fields`, `include`, and `expand` are not implemented because there is no HTTP presenter yet. The resource-specific endpoints already avoid requiring a full document for element work.

## Batch, dry-run, and undo readiness

`applyOperations` accepts up to 50 operations. It clones one document, validates and applies all operations, and commits once; an error leaves the repository unchanged. `dryRun: true` performs the same work without a commit. A successful batch increments the revision once and returns a compact change summary.

The existing editor history groups UI transactions. The service's single document commit is the compatible persistence boundary for one future logical undo entry; a server history store is still required to make remote mutations appear in the browser editor's in-memory undo stack.

## Idempotency and rate limiting

Create and batch inputs support idempotency keys. The current service cache prevents duplicates within one service lifetime. The production repository/HTTP adapter must persist `(subject, operation, key)` atomically with the mutation and retain it for a documented interval.

Rate limiting belongs at the network adapter because there is no network listener today. Recommended initial policy: track subject + client ID, with IP as a secondary abuse signal; separate read, write, batch, upload, and export buckets; return `429`, `Retry-After`, and the documented rate-limit headers. Do not trust an IP as user identity.

## Assets, exports, and remote URLs

Edon currently imports images as raster data URLs and exports locally through browser canvas/download APIs. The service rejects remote image URLs and accepts only base64 PNG/JPEG/WebP/GIF data URLs, so it performs no server-side fetch and has no SSRF path.

Assets and asynchronous exports are marked unsupported by `/capabilities` and are absent from live v1 paths. A production implementation needs object storage, server-side MIME sniffing and size/dimension checks, signed short-lived download URLs, job persistence, and a renderer. Only then should `/assets` and `/exports` be added.

## Limits

All implemented limits live in `API_LIMITS`: 100 records/page, 50 operations/batch, 200 slides/document, 5,000 elements/slide, 50,000 text characters, 200 search characters, and 16–8,192 px canvas dimensions. The future HTTP adapter must additionally reject oversized request bodies before JSON parsing.

## Validation

```bash
npm run test:api
npm run validate:openapi
npm run check
```

The API flow test covers scope enforcement, IDOR-style foreign access, idempotency, stale revisions, unsafe remote image input, dry-run, successful batch commit, rollback, search, and a complete create/edit workflow. OpenAPI validation checks unique operation IDs and the ChatGPT tool-to-operation mapping.

## Future HTTP quickstart

The following is the intended flow after a server adapter is deployed; it is not a claim that the static site currently serves these routes:

1. Obtain an OAuth access token from the configured provider.
2. `GET /api/v1/projects`.
3. `POST /api/v1/projects` with an `Idempotency-Key`.
4. `POST /api/v1/documents` with that project ID.
5. Create a slide and element using the latest revision.
6. Use `POST /api/v1/documents/{id}/operations` for atomic multi-change edits.

The production adapter must also add strict-origin CORS, JSON content-type enforcement, body limits, request IDs, structured logs/metrics, durable audit records, rate limiting, and no-store cache headers for private responses.
