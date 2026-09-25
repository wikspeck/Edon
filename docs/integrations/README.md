# ChatGPT and MCP readiness

As of September 2026, the current OpenAI integration route is a remote MCP server with focused tools, structured input/output schemas, correct safety annotations, and OAuth 2.1 for user data. Edon does not add a legacy `ai-plugin.json` manifest.

Official references:

- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [Authenticate plugin users](https://developers.openai.com/plugins/build/auth)

## Prepared tool set

`src/integrations/chatgpt/tools.ts` maps a deliberately compact initial set to stable OpenAPI operation IDs:

- discovery/read: `list_projects`, `get_project`, `list_documents`, `get_document`, `list_slides`, `list_elements`, `search_edon`
- focused writes: `create_project`, `create_document`, `create_slide`, `create_element`, `update_element`
- compound writes: `apply_operations`

Each definition records scopes plus `readOnlyHint`, `destructiveHint`, and `openWorldHint`. Delete behavior stays available through the API and batch operation, but a future MCP handler must request confirmation for ambiguous or high-impact deletion. The tool output should use the existing compact mutation and change-summary shapes.

## MCP adapter requirements

The adapter should use the official TypeScript MCP SDK and expose streamable HTTP at a stable HTTPS `/mcp` URL. It should register tools from the prepared mapping, translate schemas from the public contract, call `EdonPublicApiService`, and return stable IDs in `structuredContent`.

Before it can be built truthfully, Edon needs:

1. Server-side persistence for users, projects, documents, grants, idempotency, audit events, and export jobs.
2. An established identity provider supporting OAuth discovery, authorization code + S256 PKCE, audience/resource binding, revocation, and the MCP protected-resource metadata document.
3. A sync/migration design for existing browser-local work; silent upload is not acceptable.
4. A server deployment that can validate ChatGPT's OAuth tokens and, where used, OpenAI-managed mTLS.

The MCP handler must authorize every call server-side. Tool annotations and model instructions are usability metadata, not security controls.

## OAuth publication checklist

- Publish `/.well-known/oauth-protected-resource` on the MCP resource origin.
- Configure provider discovery metadata and advertise `S256`.
- Validate issuer, audience/resource, expiration, scopes, and revocation on every call.
- Declare OAuth scopes per tool and return the MCP `mcp/www_authenticate` challenge when linking or reauthorization is required.
- Use the exact redirect URI shown by the ChatGPT integration configuration.
- Add an authenticated read-only profile tool if multiple connected accounts need to be distinguishable.
- Keep access/refresh tokens out of browser storage, logs, tool output, and source control.

## Security and privacy review

The prepared core uses field allowlists to prevent mass assignment, finite/ranged number checks, strict color and ID formats, same-slide group-parent validation, access checks for every resource, scoped principals, cursor/page limits, optimistic concurrency, and atomic batches. Remote image URLs are rejected, eliminating server-side URL fetching in the current surface.

The future adapter must add defenses that only make sense at the network boundary: strict CORS allowlists, CSRF protection if cookie authentication is ever used, OAuth bearer validation, request/body limits before parsing, per-client/user rate limits, secure headers, safe redirect allowlists, secret management, log redaction, and durable audit/metrics. Server-side rendering and upload processing require separate XSS, MIME, decompression-bomb, and path-traversal review.

## Publication status

The repository is contract- and service-ready, not publish-ready. Do not submit the placeholder OpenAPI server URL or connect ChatGPT to the static Cloudflare asset deployment. Once the four prerequisites above exist, the remaining work is a thin HTTP/MCP host plus end-to-end OAuth and production security verification rather than a redesign of Edon's document operations.

