# UI design

Create a UI design file from the new-file dialog. Its kind remains fixed and
vector tools are the default. Pixel tools are under Properties → Advanced.

The inspector inserts buttons, inputs, checkboxes, cards, navigation, badges and
containers. Children remain editable layers. Ctrl-click or select a child in
Layers to change its typography, vector geometry or effects. Container selects
the parent; group auto layout supports rows/columns, spacing, padding, alignment
and distribution. Layout positions are stored consistently for editor and MCP.

Components create editable instances. Update from source explicitly refreshes
an instance; overrides and automatic live master synchronization are not yet
implemented. Motion supports load, hover and click, fade/rise/scale, timings,
easing and repetition. Custom JSON keyframes accept offset, opacity,
translateX/Y, scale and rotate. Preview motion runs in the editor.

Export → Website downloads standalone HTML/CSS/JavaScript with editable vector
appearance, semantic controls and animations. The fixed design scales down on
smaller screens. It does not infer responsive breakpoints, backend actions or
framework application code. Links work; forms still need application wiring.

Vector bucket fill creates a separate fill linked to a closed source contour.
Fill follows source geometry and is drawn below it. Overlap is constrained to
an opaque centered contour, preventing visible bleed outside it. Arbitrary open
line fragments are not automatically reconstructed into enclosed regions.

Glow supports contour/circle/rectangle, falloff, offsets, strength, blur and
spread. Canvas, SVG, raster preview and website export share those definitions.
Zoom supports up to 6400%; CSS layout zoom avoids resampling the whole artboard
as a composited bitmap. Raster layers retain nearest-neighbor pixel rendering.

MCP/plugin: Edon Windows 0.4.0 and Edon plugin 1.2.0. Create kind `ui`, patch ui
metadata, effects/path geometry/vectorFill, inspect get_preview, use export_ui
for HTML source. Local stdio remains required; web storage is separate.

Release verification (0.4.0): automated UI/editor/MCP checks passed. The packaged
Windows app was exercised through its real local MCP bridge and inspector.
HTML controls and motion, PNG glow shapes and crisp pixel zoom around 1000%
were inspected. The public Windows download was streamed in full and its
113474843 bytes matched the release SHA-256.
