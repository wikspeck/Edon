# Edon MCP

## Edon plugin

The Edon 1.2.0 plugin packages the MCP server with branding, starter prompts
and the edon-design skill. It is installed locally as edon-mcp@edon-local.
Restart Codex to load it; keep Edon desktop open. The previous standalone
MCP registration was removed to avoid duplicate tools.

[Private plugin](https://chatgpt.com/plugins/plugins_6aca4ff6c3008191b47794deeba29ac7).
An account copy still requires a host that supports local stdio processes.

To install from a source checkout:

```powershell
codex plugin marketplace add C:\Users\wiksp\Documents\GitHub\Edon\plugins
codex plugin add edon-mcp@edon-local
```

## Standalone MCP configuration

The following remains an alternative setup; do not enable both at once.

The local MCP server edits the workspace of the running Windows desktop app.
It connects through an authenticated loopback bridge. It does not expose your
designs on the internet, execute scripts, or grant arbitrary filesystem access.
The web app alone cannot host this local connection.

Start Edon desktop and open the workspace. Node.js 22 or newer is required for
the MCP client process. Register the server with Codex:

```powershell
codex mcp add edon -- node C:\Users\wiksp\Documents\GitHub\Edon\plugins\edon-mcp\server.mjs
```

Restart Codex after registering. Other MCP clients can use
`plugins/edon-mcp/mcp.json`, replacing `${PLUGIN_ROOT}` with its absolute path.
The plugin directory is self-contained and has no npm runtime dependencies.

Tools: `get_connection`, `list_projects`, `get_project`, `create_project`,
`list_documents`, `get_document`, `create_document`, `list_slides`, `create_slide`,
`list_elements`, `create_element`, `update_element`, `apply_operations`,
`search_edon`, `open_document`, `get_preview`, `undo_document`, `redo_document`, `export_ui`.
Previews return an actual PNG rendered with the same components as the canvas.

Read the document first. Pass stable document, slide and element IDs, and the
latest `ifMatchRevision` inside `input` for writes. Complex edits should use
`apply_operations` with `dryRun: true`, then apply using the unchanged revision.
A batch is atomic and creates one undo step in the open canvas editor. Writes
are refused during a brush stroke or drag. Edits to closed documents are saved;
open them with `open_document` to see them. Undo history is kept for the open
editor session, as with manual edits.

Example prompt: “Create an 800 × 600 canvas in Edon, add a dark background,
an orange circle and a title, then open it.”

Restarting Edon rotates its connection token and port. The MCP process discovers
them from `%APPDATA%\Edon\mcp-connection.json` for every call. Never copy that
file into a plugin package or publish it. Closing Edon removes it.

Validation: `npm run test:mcp`, `npm run test:api`, `npm run test:editor`,
`npm run typecheck`, `npm run lint`, `npm run build`.

Verified on the packaged Windows 0.3.2 app: MCP created two visible layers,
a later two-layer batch was undone in one step and redone, and the PNG preview
matched the canvas. The independent stdio test covers authentication, startup,
tool discovery, revisions, retries, dry-run and rollback. Codex registration
requires a host restart before the new tools appear in an existing chat.

## Keeping app and plugin aligned

UI files use kind `ui`; element patches support ui, pathData, effects, cornerRadii and vectorFill. The HTML export is available through export_ui. Requirements: desktop 0.4.0, plugin 1.2.0.

Run `npm run sync:mcp` after OpenAPI changes. `npm run check:mcp-schema` fails when the packaged tool schemas drift. Every feature change must include applicable contract, validation, tools, skill, tests and plugin release updates. No Plugin Creator tag is needed when asking for an Edon change. Existing host sessions need a restart to load new plugin tools.
