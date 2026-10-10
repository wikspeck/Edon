---
name: edon-design
description: Create, inspect and edit designs in the running Edon desktop app using its MCP tools. Use when the user asks to work in Edon, create a logo, compose a canvas, edit shapes or text, or build presentation pages in Edon.
---

# Design in Edon

Use the Edon MCP tools to work on actual local designs. Start with get_connection.
If the desktop is disconnected, ask the user to open Edon 0.4.0 or newer. Do not
pretend to edit the browser app; its storage is separate from desktop storage.

## Choose the real document

Inspect the activeDocumentId from get_connection. Read it with get_document when
the request concerns the open design. Otherwise use list_documents or search_edon.
Preserve the user's existing artwork. For a new design, create_document using an
appropriate name and dimensions, optionally inside an existing project.

## Make editable artwork

Use list_slides and list_elements to discover stable IDs. Create real shapes,
text, paths and groups using create_element or apply_operations. Tool input
schemas describe editable properties. Keep meaningful layer names, purposeful
spacing, consistent type and a coherent palette. Prefer editable vector layers
for logos. Do not flatten a design merely to make a preview.

Inspect the current revision before every write. Pass ifMatchRevision inside
input. For related edits use one apply_operations batch, at most 50 operations.
For complex changes first validate with dryRun: true; apply the same operations
against the original revision only if it still matches. A conflict requires
reading the latest document and adapting the edit, never overwriting it blindly.
Use a fresh idempotencyKey for each logical creation/batch, reuse it for retries.

## Inspect and finish

Use open_document to show the result in Edon and get_preview to inspect a real
rendered PNG. Check layout, clipping, text, layering and contrast; correct visible
issues before declaring completion. Complex batches in the open editor are one
undo step. undo_document and redo_document require the open document's ID and
current revision. Stop modifications while a manual drag or brush stroke is busy.

Summarize the actual result and identify the document by name. Report unavailable
capabilities accurately. The current connection covers UI, canvas and presentation
artwork; do not claim to automate the DJ timeline, video timeline or rich document
formatting. Do not run arbitrary code or manipulate storage files as a substitute
for the MCP tools.

## UI design

Create UI files with create_document input.kind = "ui". Keep them vector-first.
Use groups for semantic components and set ui.role to button, input, checkbox,
card, navigation, badge or container. Add editable child vectors/text with
parentId. Use ui.label for accessibility and only safe http(s), mailto, relative
or anchor href links. UI layouts materialize child positions on commit, using
ui.layout direction, gap, padding, align and justify. Instances can record
ui.component name/sourceId; refresh manually, do not claim live symbol overrides.

Set ui.animation for fade/rise/scale/custom presets, load/hover/click trigger,
duration/delay in milliseconds, easing, repeat and distance. Custom keyframes
accept offset 0–1, opacity, translateX/Y, scale and rotate only. These are
declarative data, not arbitrary Python or JavaScript execution.

For vector fills, create a separate vector element with vectorFill sourceId
and overlap, then clear the source fill. Source must be closed and on this
page. Its contour remains above the fill; bounded overlap follows source edits.
Open, unrelated line fragments cannot be treated as a closed contour.
Effects include glow shape (contour/circle/rectangle), falloff and offsets;
pathData and cornerRadii are editable. Prefer atomic batches with dryRun first.

export_ui returns standalone HTML/CSS with semantic controls and animations.
Inspect its source and get_preview before handing it off. Fixed page dimensions
scale to narrower screens; do not promise breakpoint reflow, application logic,
backend forms or a framework project. Save returned HTML as an artifact using
host file tools if requested. get_preview is a static image, not motion proof.
