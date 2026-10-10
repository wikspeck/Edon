# Edon app and plugin parity

The user expects Edon changes to include its existing MCP/plugin integration,
without needing to mention Plugin Creator again. Preserve existing artwork and
keep browser and desktop implementations aligned.

For a feature with new editable state or behavior, update the document model,
public API contract and validation, OpenAPI, desktop MCP handler, packaged tool
schemas and `plugins/edon-mcp/skills/edon-design/SKILL.md` as applicable. Run
`npm run sync:mcp` and `npm run check:mcp-schema`; add meaningful integration
coverage for new capabilities. Pure visual fixes need no invented MCP endpoint.

When releasing changed plugin files, update the existing private Edon plugin,
not a new plugin. Inspect its current source/release first and preserve its
logo, account metadata, prompts, connection and audience. Publish a version
bump with the matching desktop release. Never edit installed plugin caches.

Keep web and Windows releases current when completing an app feature. Use the
separate download Worker so a website deployment cannot remove Windows assets.
Verify actual downloaded bytes/hash before reporting a release available.
