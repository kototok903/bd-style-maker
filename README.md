# BD Style Maker

A local web workspace for editing BetterDiscord `.theme.css` files. Built with Vite, React, TypeScript, Tailwind CSS v4, and shadcn/ui with Base UI.

## Run locally

Requires Bun and a current Node.js release supported by Vite 8 (Node 22.12+ or 24+).

```sh
bun install
bun run dev
```

Open the localhost URL printed by Vite. It selects another port if the default is occupied. Keep the same origin/port to recover the same browser draft.

```sh
bun run verify    # formatting, lint, typecheck, tests, production build
bun run build
bun run preview  # serve the production build locally
```

## V1

The left pane has two modes sharing one source document and undo history:

- **Guided editor:** create, edit, and remove CSS variables in individual rules. Add selectors, then edit a limited set of properties: text/background/border color, corner radius, font size, padding, gap, and opacity. Use a direct value or bind a property to a CSS variable. Literal hex colors get a native color picker; all values retain a CSS text field for units, alpha colors, expressions, and fallbacks. Text fields commit on Enter or blur; Escape restores the field value.
- **CSS editor:** unrestricted source editing with CodeMirror, CSS highlighting, line numbers, folding, search, syntax diagnostics, and source navigation from guided settings. Unknown rules remain in the source even when the guided mode doesn't expose them.

Additional functionality:

- Open/drop any UTF-8 `.theme.css` or `.css` up to 2 MB, paste CSS, start empty, or try the Midnight starter. No theme catalog or proprietary metadata tag is required.
- Preserve original source on export, including BOM/newlines, comments, unknown metadata, imports, and declaration order. Guided edits patch the selected declaration rather than rebuild the file. Duplicate declarations and conditional scopes remain separate.
- Leading metadata editor, undo/redo, undoable reset, original/current preview comparison, and a source diff.
- IndexedDB draft autosave/recovery. Opening another theme with unexported changes offers download, discard, or cancel. Browser draft storage is separate from exporting a theme file.
- Sandboxed, bundled Discord-like preview with dark/light appearance, chat/settings scenes, element selection, and a count of selectors matching the mounted fixture. Imported theme CSS cannot access or style the editor document.
- Remote-resource toggle, optional HTTPS source URL for resolving relative preview paths, and bounded read-only inspection of direct/nested imports. Original import URLs and conditions stay unchanged in export.
- Download a `.theme.css` or copy the current CSS. Incomplete metadata or malformed CSS does not prevent downloading source to keep your work.
- Resizable desktop panes and a stacked mobile workspace.

Shortcuts: `Cmd/Ctrl O` open, `Cmd/Ctrl S` export, `Cmd/Ctrl Z` undo, `Cmd/Ctrl Shift Z` redo, and `Cmd/Ctrl F` search inside the CSS editor. Text inputs keep their normal local editing shortcuts.

## Preview and dependency limits

The preview is an original, approximate fixture, **not the live Discord client**. It supports common background/text variables, `--brand-500`, and the bundled starter's selector patterns. It does not replicate Discord's exact class hashes, full DOM, plugins, or desktop transparency. Unmatched selectors can target an unmounted scene or a different Discord version; they are not automatically invalid. Always verify the exported theme in BetterDiscord. See [compatibility notes](docs/compatibility.md).

External resources start paused. Enabling them permits HTTPS CSS, fonts, and images in the preview and makes requests to their hosts. Reading remote source is a separate action and depends on CORS. Inspecting dependencies never writes to them or bundles them into the output. Remote-source variables are viewable as read-only CSS, not automatically editable settings in v1.

A dropped file has no reliable original filesystem URL. Supply its original HTTPS URL for relative paths, or change paths in CSS. Local companion-file resolution, dependency editing/bundling, true offline asset export, full cascade inspection, and automatic installation into BetterDiscord are not included in v1.

CSS parsing catches structural errors, not every invalid property value. When source is structurally invalid, guided edits pause, the last valid preview is labeled, and the exact current source remains editable/exportable. Raw CSS values are not silently normalized or converted into computed values.

Drafts belong to the current browser origin/profile. Export important work; browser storage can be cleared and is not a backup. V1 maintains one active draft and does not coordinate concurrent edits across multiple tabs.

## Organization

`src/app` composes the workspace. `src/features/theme` owns source parsing and surgical edits; `editor` owns controls, CodeMirror, history, and session hooks; `preview` owns the opaque-origin fixture and its validated MessageChannel protocol; `dependencies` reads/rebases preview resources; `projects` persists drafts; `theme-export` handles files. Shared shadcn components live in `src/components/ui`.

The original design plan and interactive study remain in `docs/`. The shipped app implements the two-mode refinement requested after that study.
