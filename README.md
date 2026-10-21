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

- **Visual editor:** Theme settings shows local CSS variables and global typography, organized into expandable sections from short standalone comment headings. Notes remain in source order; settings without headings stay in a plain list. Search includes author comments. A search-side options popover filters by CSS location and reveals technical names; duplicate settings always retain their actual selectors and conditions. Element styles lists existing source rules and named preview elements, with an inspector shortcut. Hover, ancestor, nested, conditional and repeated rules remain separate. Selecting an unused element leaves the source untouched until a property is added. View in CSS opens the original location; structural edits and custom variables belong in the CSS editor. Literal colors use a swatch popover with alpha controls; CSS expressions remain editable text. Text fields commit on Enter or blur; Escape restores the field value.
- **CSS editor:** unrestricted source editing with CodeMirror, CSS highlighting, line numbers, folding, search, syntax diagnostics, and source navigation from guided settings. Unknown rules remain in the source even when the guided mode doesn't expose them.

Additional functionality:

- Open/drop any UTF-8 `.theme.css` or `.css` up to 2 MB, paste CSS, start empty, or try the Midnight starter. No theme catalog or proprietary metadata tag is required.
- Preserve original source on export, including BOM/newlines, comments, unknown metadata, imports, and declaration order. Guided edits patch the selected declaration rather than rebuild the file. Duplicate declarations and conditional scopes remain separate.
- Leading metadata editor, undo/redo, undoable reset, original/current preview comparison, and a source diff.
- IndexedDB draft autosave/recovery. Opening another theme with unexported changes offers download, discard, or cancel. Browser draft storage is separate from exporting a theme file.
- Sandboxed, bundled Discord DOM/base CSS snapshot with dark/light appearance, element selection, fit/100% zoom, and a count of local selectors matching the mounted document. Imported theme CSS cannot access or style the editor document.
- Element inspection covers bars, channels/categories, members/groups, server folders, messages, composer/account controls, tooltips and inner parts. Click to pin, navigate the hierarchy or choose a state, check the selector's match count, then use the selector to edit/create a local rule. Alt+Up/Down moves through the hierarchy; Escape cancels. Sample message content includes replies, mentions, quotes, code, spoilers and reactions.
- Automatic loading of direct/nested theme CSS imports with caching, URL rebasing, preserved layer/supports/media conditions, and visible failure reporting. A resource toggle can pause requests. An optional HTTPS source URL resolves relative paths; import inspection remains read-only. Original import URLs and conditions stay unchanged in export.
- Download a `.theme.css` or copy the current CSS. Incomplete metadata or malformed CSS does not prevent downloading source to keep your work.
- Resizable desktop panes and a stacked mobile workspace.

Shortcuts: `Cmd/Ctrl O` open, `Cmd/Ctrl S` export, `Cmd/Ctrl Z` undo, `Cmd/Ctrl Shift Z` redo, and `Cmd/Ctrl F` search inside the CSS editor. Text inputs keep their normal local editing shortcuts.

## Preview and dependency limits

The preview uses sanitized markup and the full ordered base styles captured directly from the current Discord web client (2026-10-17). Structural measurements were compared with the live client, both unthemed and with MaterialDiscord/system24. It is still a captured client state, with version-dependent selectors and no live account connection, plugin UI, or desktop transparency. The member-list icon works locally; sample content replaces account data. See [provenance](src/features/preview/fixture/NOTICE.md) and [compatibility/validation notes](docs/compatibility.md).

Theme resources load automatically, including nested HTTPS CSS imports, fonts, and images. These make requests to their respective hosts. Failed imports show an explicit error rather than silently presenting the default appearance as a finished theme. When CORS blocks source reading, a native browser-import fallback can still render the theme and reports stylesheet load/error events. Source inspection remains unavailable for those resources. Pause requests in Imports. Successful CSS sources are cached for the session, so guided changes do not fetch entire dependencies again. Imported variables are read-only unless you add a local override in the CSS editor; dependencies are never bundled into exported files.

A dropped file has no reliable original filesystem URL. Supply its original HTTPS URL for relative paths, or change paths in CSS. Local companion-file resolution, dependency editing/bundling, true offline asset export, full cascade inspection, and automatic installation into BetterDiscord are not included in v1.

CSS parsing catches structural errors, not every invalid property value. When source is structurally invalid, guided edits pause, the last valid preview is labeled, and the exact current source remains editable/exportable. Raw CSS values are not silently normalized or converted into computed values.

Drafts belong to the current browser origin/profile. Export important work; browser storage can be cleared and is not a backup. V1 maintains one active draft and does not coordinate concurrent edits across multiple tabs.

## Organization

`src/app` composes the workspace. `src/features/theme` owns source parsing and surgical edits; `editor` owns controls, CodeMirror, history, and session hooks; `preview` owns the opaque-origin fixture and its validated MessageChannel protocol; `dependencies` reads/rebases preview resources; `projects` persists drafts; `theme-export` handles files. Shared shadcn components live in `src/components/ui`.

The original design plan and interactive study remain in `docs/`. The shipped app implements the two-mode refinement requested after that study.
