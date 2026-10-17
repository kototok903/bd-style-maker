# BD Style Maker — product and implementation plan

Original design plan · 2026-10-17. V1 now implements the subsequent two-mode refinement: guided controls and a direct CSS editor in the left pane. See `../README.md` and `compatibility.md` for shipped functionality and limits; later phases below remain proposals. The accompanying `ui-exploration.html` is the original design prototype using a fictional sample theme.

## Product direction

A local, browser-based workspace for opening, understanding, editing, previewing, and exporting any BetterDiscord theme. A user should be able to start with their own `.theme.css`, a pasted stylesheet, or a minimal starter. The theme's actual source remains available throughout.

The core promise is **complete CSS access with visual assistance**. Any stylesheet can be edited as text; useful visual controls are derived from the source where possible. We cannot infer every theme author's intent or translate arbitrary CSS into a perfect settings form. Unknown values and selectors must remain editable and survive export.

Use a compact editor interface: neutral application chrome, resizable settings/source and preview panes, inline value editors, keyboard shortcuts, and local draft recovery. Keep the editor's appearance independent of the theme being edited.

## Findings from the references

- BetterDiscord's format is a leading JSDoc metadata comment followed by vanilla CSS, distributed as `*.theme.css`. Required metadata fields are `name`, `author`, `description`, and `version`. There is no universal theme settings schema. [Theme structure](https://docs.betterdiscord.app/themes/introduction/structure).
- Variables are a common customization convention, but may be declared in any selector, overridden in descendants, and contain only fragments of CSS values. Adjacent comments sometimes document defaults and allowed options. [User configuration](https://docs.betterdiscord.app/themes/tutorials/user).
- A small theme file can import most of its implementation remotely. Imports, relative assets, and external dependencies are core compatibility concerns. [Remote imports](https://docs.betterdiscord.app/themes/tutorials/remote).
- Themes compete with Discord's selectors and CSS cascade. Editing support and preview fidelity are separate capabilities. [Working with selectors](https://docs.betterdiscord.app/themes/tutorials/selectors).
- The local `BDThemeEditor` is a Svelte application using hand-authored theme schemas. `src/types/theme.ts`, `src/types/inputs.ts`, and `src/data/themes/*.ts` define the settings available for each theme.
- Its `src/components/editor/Upload.svelte` accepts only a file with an `@BDEditor` tag matching the selected base theme. It restores known variables/imports rather than opening arbitrary source. The upload dialog explicitly says only themes downloaded through that editor can be uploaded.
- Its `Download.svelte` builds a new file from metadata, imports, and schema variables. Arbitrary uploaded rules are not retained as a general source document. Its preview embeds the external [ThemePreview](https://github.com/Gibbu/ThemePreview) fixture.
- `connections-info`: Bun, Vite, React/TS, Tailwind v4 via `@tailwindcss/vite`, shadcn `base-nova`, neutral semantic tokens, Geist, lucide, `@/` aliases, feature folders, and Vitest. `pdf-editor`: similar foundation with `radix-nova`, `app/`, feature `components/`, `hooks/`, `lib/`, pure domain utilities, history, and IndexedDB drafts. Follow those organization patterns; choose Base UI for this new app to match the newer reference.

## User journey

1. **Open**: select/drop a `.theme.css`, paste CSS, resume a draft, or create a starter. No catalog registration, recognized theme name, or proprietary marker required. Plain `.css` is accepted with a filename/metadata notice.
2. **Understand**: immediately show source, discovered variables, metadata, imports, and diagnostics. Render local content without waiting for dependencies. If CSS has errors, open it in source mode with diagnostics instead of rejecting it.
3. **Edit**: use visual controls, a selector/declaration inspector, or unrestricted source. The modes edit the same document. Each visual control can jump to its exact source declaration.
4. **Preview**: see the theme applied to an isolated Discord fixture; change light/dark context and sample scene. Unavailable imports and fixture limitations are visible without preventing editing.
5. **Review**: compare changes against the original; undo/redo; reset an individual value; review metadata and dependency status.
6. **Export**: download an ordinary `.theme.css`, copy CSS, or optionally save back to a user-selected file when browser APIs support it. Export preserves unknown CSS and attribution. Draft autosave is clearly distinguished from writing a theme file.

## Editing surfaces

### Visual settings

Start with **all discovered custom property declarations**, grouped by source file, selector, and conditional context. Offer a search across names, values, comments, and selectors. Optional presentation groups such as Colors, Background, Typography, and Layout improve navigation but do not hide unclassified variables.

Each row includes the original variable name, literal value, selector/context, a suitable control when unambiguous, reset, and “View source.” Human-friendly labels and descriptions from comments are suggestions; the original identifier remains visible. Known theme adapters can improve labels, groups, and choices later, but are optional enhancements.

| Value                                                | Assistance                                      | Preservation rule                                                                  |
| ---------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Complete color (`#hex`, `rgb()`, `hsl()`, `oklch()`) | Color picker + text field                       | Preserve original notation unless the user changes it; support alpha and raw input |
| Number or dimension (`0.8`, `12px`, `1rem`)          | Number field + unit selector                    | Never infer a hard min/max from the current value; sliders need documented ranges  |
| Image `url(...)`                                     | URL field + thumbnail when permitted            | Keep quoting and URL semantics; never export temporary blob URLs                   |
| Font family                                          | Raw font stack + optional family selector       | Retain fallbacks; fonts need an actual source, not just a name                     |
| Documented enum                                      | Select + raw input                              | Only offer choices backed by comments or a known adapter                           |
| `var(...)`, `calc(...)`, gradients, compound values  | Raw CSS field + optional swatch/resolved sample | Preserve expressions; do not replace them with computed literals                   |
| Color fragments (`255, 255, 255` or `220 80% 50%`)   | Raw field initially                             | Only show a specialized control when usage/adapter establishes the format          |

Keep `:root`, `.theme-dark`, `.theme-light`, nested rules, `@media`, `@supports`, and `@layer` contexts distinct. Two declarations with the same name are not the same setting. Scope selection means “edit declarations in this context,” not “rewrite every occurrence.” Changing preview appearance does not move declarations or change their scope.

Themes without variables still open normally: show an explanation, the rule inspector, and source. Allow the user to add a variable or declaration explicitly; do not invent a synthetic set of variables and claim it controls the theme.

### Source

A dedicated CSS editor with syntax highlighting, search, folding, line numbers, diagnostics, and jump-to-declaration. Recommend CodeMirror 6 for a focused CSS workspace; use its separate packages and a small React wrapper. Evaluate worker-backed parsing only if the compatibility corpus needs it. [CodeMirror project](https://github.com/codemirror/dev).

Support every CSS construct as text, including custom selectors, keyframes, pseudo-elements, nested CSS, custom properties, and new browser syntax. “Unrestricted source” does not imply the installed Discord client supports every CSS feature.

On a parse error, retain the exact current text, highlight the problem, pause visual mutations, and keep the last valid preview visibly marked as stale. Never repair or delete text automatically. Parsing does not establish semantic CSS validity; use editor/browser diagnostics where available and avoid claiming complete validation.

### Inspector

Two entry points: select a rule from the parsed source outline, or select an element in the preview. Show selectors, authored declarations, source file/line, and context; navigate to source. Distinguish authored values from computed samples. Editing a declaration updates that exact declaration. Add/remove/disable declarations as explicit source transactions.

For a selected preview element, list applicable authored rules with readable source access. Treat full browser-DevTools cascade parity as later work: inheritance, importance, specificity, layers, conditional rules, shorthand interactions, and animations make a complete cascade explanation substantial. A computed value is a sample for the fixture, not a universal effective value.

### Metadata, dependencies, and changes

- Metadata uses form fields over the leading comment while preserving unknown tags, order, attribution, and unrelated comments. Missing required metadata is repairable; do not silently insert an author or rename someone else's work.
- Dependencies show direct and nested imports, original URL, retrieval status, source availability, and whether they are included in export. Distinguish “rendered externally,” “source readable,” “cached,” and “unavailable.” A cross-origin stylesheet may render without permitting source inspection. [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).
- Changes show a diff against the imported original and allow returning to a source location. For remote imports, a local override is an explicit action and may not win the cascade. Explain the actual context instead of appending `:root` and claiming success.

## Document model and synchronization

The canonical state is a versioned source string, not a map of variable names to values. Keep the original bytes/text and encoding information for unchanged export. Support UTF-8 first; handle BOM/newlines explicitly and report unsupported encodings instead of silently corrupting a file.

Suggested conceptual model:

```ts
type ThemeDocument = {
  id: string;
  fileName: string;
  originalText: string;
  text: string;
  revision: number;
  lastExportedRevision: number | null;
};

type DeclarationRef = {
  documentId: string;
  revision: number;
  from: number;
  to: number;
  selector: string;
  contexts: string[];
  property: string;
};
```

1. Parse a revision with PostCSS, retaining source locations and raw formatting. Use value/selector parsing helpers where needed; do not parse CSS by splitting lines or semicolons. [PostCSS API](https://postcss.org/api/).
2. Derive metadata, an outline, declarations, imports, and diagnostics. These indexes are disposable, revision-tagged views over source.
3. A visual action creates a minimal text edit against a declaration at that revision. Locate value boundaries with syntax-aware logic; PostCSS declaration positions alone are not value ranges. Preserve surrounding spaces, comments, `!important`, and newlines.
4. Reject/re-resolve stale references when the source changes. Reparse after transactions; never apply an old offset to newer text. Debounced parser results must also pass a revision check.
5. Route source edits and visual edits through one transaction/history layer. Coalesce a color drag or number scrub into one undo operation. Avoid independent CodeMirror and form histories that disagree about the document.
6. Preview receives the latest valid revision and acknowledges it. An older response cannot overwrite a newer preview. Separate document, selection/panel state, and preview state.

No automatic whole-file formatting. “Open → export without changes” must retain the file exactly. After edits, untouched text remains unchanged. Offer formatting only as an explicit operation later.

## Dependencies and local operation

The MVP is a client-side SPA served by Vite on localhost, with no account or hosted backend. Source, drafts, and bundled preview fixtures stay on the device. Remote theme imports, images, and fonts still require network access when enabled; “local” is not a promise that third-party resources work offline.

Preserve the import graph and source order. Resolve relative imports/assets against the importing resource URL; keep `layer()`, `supports()`, and media conditions. Prevent infinite recursion with cycle detection, depth/size limits, and bounded fetches. Plain dropped files have no reliable filesystem base: let users supply sibling files or a base URL, otherwise report unresolved relative paths.

MVP remote source is read-only. Where CORS allows it, fetch and index imports for navigation and variable discovery. A root-level local override can be offered only with explicit target scope and a cascade caveat. **Editing arbitrary dependency rules** requires a later “Make local copy” workflow and correct export of that copy.

Default export retains imports. Never silently flatten, reorder, remove, or rewrite an import. A dependency blocked by CORS can still be retained in exported CSS. Manual dependency upload is the client-only fallback. If broad remote fetching proves essential, add an optional loopback resolver in a later phase; that is a separate runtime beyond Vite's frontend dev server. It must not become an open proxy or permit arbitrary local-network/file access.

Bundled/offline CSS export is later work: preserve import conditions and layer order, rebase URLs, retain attribution, and fail visibly on unresolved resources. Fonts/images may remain external unless explicitly embedded. A project backup format can retain local files and assets separately; it is not a BetterDiscord theme export.

## Preview strategy — validate this first

**Hard boundary:** a generic chat mockup does not faithfully render arbitrary BetterDiscord themes. The fixture must have compatible Discord DOM, base styles, classes, attributes, and states. A theme can be fully editable even if its selectors do not match the fixture.

Run an initial compatibility spike comparing the external ThemePreview approach with a self-hosted, versioned fixture. Inspect current DOM coverage, asset/license requirements, and maintenance cost before copying anything. Recommend a bundled fixture to remove the runtime dependency on a third-party preview host, conditional on this spike. Track fixture revision/date and a tested-theme matrix. Do not infer the current Discord/Electron version from the older selectors tutorial.

Initial scene: guild channels, messages, member list, input, hover/selected/unread states. Add profile popover, settings, and DM scenes after the core is credible. The app does not log in to Discord or iframe its authenticated website. Desktop transparency and plugin-specific UI cannot be guaranteed in a normal browser fixture; use a backdrop simulation and label the limitation.

Apply CSS inside a sandboxed iframe, never the editor document. Keep fixture markup/scripts trusted, assign theme text through a style node rather than HTML interpolation, and prevent theme content from navigating the frame or loading arbitrary scripts. A separate opaque-origin fixture with `allow-scripts` and no `allow-same-origin` is a candidate; prototype CSP/resource loading and parent/frame communication before committing to it. Do not combine same-origin scripting with a nominal sandbox and assume isolation. [iframe sandbox reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Use a typed message protocol, verify `event.source`, validate payloads and revision IDs, and bootstrap a dedicated MessageChannel/session token. An opaque-origin frame reports origin `null`, so origin-string checking alone is insufficient. Allow only required resource types/origins in the preview's CSP. Resource policy affects preview only; original source stays intact.

Expose “Approximate preview,” missing dependencies, and “No fixture matches” as precise states. A zero-match selector is not necessarily broken; it may belong to an unmounted scene. Avoid an invented overall compatibility percentage. The actual BetterDiscord client remains the final visual check. Optional client integration is a future project.

## Stack and organization

- Vite + React + TypeScript; Bun package management and scripts.
- Tailwind CSS v4 with the Vite plugin and semantic tokens in `src/index.css`.
- shadcn/ui `base-nova`, Base UI primitives, Geist, lucide-react, and `cn()`.
- Compose Field/Input/InputGroup, Tabs/ToggleGroup, Select, Popover, Dialog, Tooltip, Resizable, ScrollArea, Alert, and menus. Keep editor controls separate from the Discord preview fixture. Check current registry/API availability while implementing; no manual imitation of library controls.
- CodeMirror 6 + CSS language support; PostCSS for source analysis; value/selector parsers as justified by the spike.
- React reducer/context and focused hooks initially, with a small external store only if profiling or cross-pane updates justify it. No router or query framework required for one local workspace. IndexedDB for drafts/projects; localStorage for lightweight preferences.
- ESLint + simple import sort, Prettier + Tailwind plugin, `tsc -b`, Vitest, Testing Library. Mirror the reference `verify` script. Add browser smoke coverage for import/edit/export and iframe isolation.

```text
src/
  app/                         AppShell, AppErrorBoundary
  components/ui/               shadcn source components
  features/
    theme/                     theme-types, metadata/CSS parsing and text transactions
      lib/                     pure utilities + colocated tests
    editor/
      components/              toolbar, variable panel, source, rule inspector, diff
      hooks/                   document session, transactions/history, shortcuts
      lib/                     control inference and editor preferences
    preview/
      components/              frame and scene controls
      lib/                     protocol, resource policy, fixture compatibility
      fixture/                 trusted markup/styles/scripts in an isolated build entry
    dependencies/              resolver, graph, source viewer, status UI
    projects/                  IndexedDB, draft recovery and project backup
    theme-export/              validation, theme download and optional file save
  lib/                         shared small utilities only
  index.css
docs/
  plan.md
  ui-exploration.html
```

Do not copy the API/Vercel layer from `connections-info` or the PDF-specific abstraction layers. Pin actual dependency versions when implementing; the plan does not require reproducing a reference lockfile.

## UI examples and intended behavior

The prototype explores three screens within one consistent design, rather than three unrelated skins:

1. **Workspace**: a narrow settings pane and dominant Discord preview; scope remains visible; color/text controls and a radius adjustment show immediate feedback. A “View source” action connects forms to code. The app stays neutral while the sample theme changes color.
2. **Source & inspect**: source and preview side by side, click a sample message to expose its authored rule, then jump to source. Show declaration context and keep computed samples distinct.
3. **Open a theme**: file-first empty state, paste/create affordances, and recent local drafts. No theme catalog required to enter the editor. The prototype uses “Try sample theme” to demonstrate this flow.

Dependencies and export are supporting panels/dialogs. On desktop, panes resize/collapse. At narrower widths, use tabs/sheets; do not squash a Discord desktop layout into unusable slivers. Keep keyboard access, focus visibility, accessible field labels, contrast, and an unsaved-file indicator. App light/dark mode and preview light/dark mode are independent preferences.

The design prototype demonstrates a finite sample: controls, theme appearance, source linking, element selection, and sample export. Its sample-value synchronization is not the production CSS parser, and its chat rendering does not establish theme compatibility.

## Delivery order and acceptance gates

### 0. Compatibility and preservation spike

Build a representative corpus: an import-heavy theme, a self-contained theme, a variable-free stylesheet, duplicate variables across scopes, nested/conditional/layered CSS, alpha colors, value fragments, `var()` chains, unusual comments, CRLF/BOM, and malformed CSS. Use fixtures for deterministic tests; remote dependencies should not make CI flaky.

Prove (a) no-edit export preservation, (b) exact-declaration edits without disturbing surrounding text, (c) stale-reference protection, (d) isolated preview with measurable selector coverage for the mounted fixture, and (e) import/resource behavior. Record supported preview scenes and known mismatches. This gate decides fixture reuse and parser helpers before polishing UI.

### 1. Useful local editor

Scaffold the agreed stack and layout. Implement file/drop/paste/starter, source editor, metadata, parsed variables with conservative type inference, scope/source navigation, undo/redo, source diagnostics, local drafts, preview, import status, and `.theme.css` export that preserves original imports. Source editing covers arbitrary rules from day one. Include a basic rule outline/declaration editor; richer preview inspection follows.

Acceptance: open an unrecognized file with no `@BDEditor`; retain all unknown CSS/tags; edit one duplicate declaration without touching its peers; malformed text remains recoverable; switching modes and undo work consistently; a missing dependency does not prevent saving; export/reopen preserves edits and metadata.

### 2. Inspector and review workflow

Add preview element selection, authored-rule navigation and declaration editing, more fixture scenes, before/original comparison, a readable diff, reset-per-value, and finer dependency diagnostics. Known-theme adapters are optional improvements over generic controls.

Acceptance: selecting an element leads to the actual source declaration; unmatched fixture selectors are reported as context-dependent; original/current comparison uses the same dependency snapshot; CSS cannot escape into editor chrome.

### 3. Advanced portability

Multiple local projects, dependency local copies, project backup/assets, optional loopback resolver, explicit offline/bundled export, richer cascade inspection, and optional in-client preview integration. Build these only after real imported themes establish the need.

## Tests that matter

- Lossless unchanged export; minimal edits across complex/multiline declarations; unknown metadata preservation; encoding/newline behavior.
- Duplicate names, custom property case sensitivity, `!important`, layers, conditions, fragments, escaped strings, comments, and nested syntax.
- Concurrent parse revisions and outdated control references; one-step undo of a drag; source/form edit interleaving.
- Import cycles, failures, CORS-unreadable sources, relative URLs, nested media/layer/supports, and unresolved file assets.
- Malformed CSS never lost; last valid preview explicitly stale; draft write failures visible and export still possible.
- Browser smoke: open → visual edit → source edit → undo → refresh/recover → export → reimport.
- Preview boundary: global selectors cannot style the editor; metadata/CSS cannot inject markup/script; reject unexpected frame messages and revisions.

## Recommendation

Proceed with a source-preserving local CSS workspace and progressively richer visual controls. Validate the preview and text-edit engine first. These are the two foundations that distinguish a general theme editor from a theme-specific settings generator.
