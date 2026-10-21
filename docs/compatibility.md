# Preview compatibility and validation

## Rendering

The preview uses sanitized markup and the complete ordered CSS set captured directly from the current Discord web client on 2026-10-17. The former third-party snapshot and `_c48ade` class aliases have been removed. See [provenance and regeneration](../src/features/preview/fixture/NOTICE.md).

The capture retains the client's current `__5e434` grid/subgrid layout, inline layout variables, density/font/platform classes, structural data attributes, SVG mask relationships, chat/header/sidebar/user-panel/composer nesting, and member-list container. All 730 public CSS modules are bundled in the same order as the inspected client. The 21 public CSS mask assets and all 47 base font files are embedded as data URLs so Discord’s same-origin asset policy cannot hide icons or force fallback fonts in the isolated frame. Other asset URLs are rebased to their public URLs. This increases the bundled snapshot size in exchange for faithful, portable base rendering. Private text, IDs, images, links, and drafts are replaced before saving. A member-list toggle hides the entire captured container, matching the space released by the live client. Input and form actions are intercepted locally.

A virtual desktop canvas fits into the available pane, preventing Discord's sidebars from squeezing chat at narrow editor widths. Switch to 100% to scroll the full canvas.

This remains a versioned client snapshot. New Discord class hashes, unmounted dialogs/settings, plugin UI, desktop transparency, and live behavior require additional fixtures or updates. An exact match with an installed Discord client is not guaranteed. Local-selector match counts indicate DOM query matches, not cascade winners, conditional activity, or overall theme compatibility. Imported selectors are not included in that count. Validate exported themes in the target client.

## Theme imports

HTTPS resources are enabled by default. The preview compiler fetches CSS imports recursively and inlines them into a preview-only stylesheet, before local overrides. It rebases relative asset/import URLs and retains import `layer`, `supports`, and media conditions. User source and exported imports remain unchanged.

Successful responses are cached during the preview session. Failures are visible with the failing URL and a retry action. Paused imports produce a prominent incomplete-preview notice with an action to load theme styles. Source-reading requests omit credentials and referrers. When network/CORS errors prevent reading CSS, the preview falls back to the original native CSS import graph, preserving ordering and conditions. Browser style load/error events distinguish successful rendering from a failed load; nested import inspection/counts are unavailable in this fallback. Native resource requests follow the browser’s normal CSS loading rules. Offline hosts, missing files, or host restrictions can still block rendering.

Source-reading bounds: 15 seconds per stylesheet request, 3 MB per response, 8 MB combined CSS, 40 imports, and a nesting-depth bound. Cycles are detected. Native fallback loads are managed by the browser rather than these source-inspection limits. Local companion files are not resolved from a dropped file; supply an original HTTPS source URL for relative imports. Imported definitions are inspectable but not editable dependencies; add local overrides or edit the source project separately.

## Guided editor

Theme settings shows local variables and global typography settings. Short standalone CSS comment headings become expandable groups; explanatory and inline comments remain notes. Without headings, settings remain a plain list. The options popover beside search contains the location filter and technical-label preference. Duplicate variable names always show their actual selectors and at-rule conditions, with source lines for repeated definitions at the same location. No control type is inferred from author comment prose.

Element styles offers existing CSS selectors and named preview targets. Base, hover, ancestor, nested, conditional and repeated source rules remain distinct, with literal selectors, conditions and source lines visible. Positive selector subjects determine grouping: a descendant is not treated as styling its ancestor, and negation/`:has()` arguments are not treated as positive targets. Unrecognized selectors remain available verbatim. Shared selector lists retain one source rule and identify that edits affect the whole list. Selecting an unused target does not write an empty rule; confirming a property creates the rule and declaration together. The CSS editor handles custom variables, structural edits and arbitrary selectors.

Edits patch the original declaration. Element-style properties can be deleted; removing the last declaration also removes a newly added rule when it contains no comments or nested content. Original rules are retained, and variables have no delete action in Theme settings. View in CSS and restore-original actions preserve the source workflow. Literal colors, including `oklch()`, have a swatch popover using the shadcn.io picker adapted to the project's Base UI primitives, with opacity controls. Opening the picker or switching its output format leaves source unchanged. Alpha-only edits retain the original functional color notation; other color changes emit hex with alpha. CSS expressions and variable references remain text fields.

## Isolation

The iframe uses `sandbox="allow-scripts"` without same-origin privileges. The captured document is sanitized before saving to remove account content, scripts, resource links, metadata, event handlers, and private asset references. Its CSP permits only the app's nonced bootstrap script. Theme text is assigned through a style node's `textContent`, never interpolated as HTML. The bootstrap checks the parent window and per-instance token, then transfers a dedicated MessageChannel. Subsequent updates validate payload types, sizes, and revision IDs. Theme CSS cannot style or read the editor document. The remote-resource toggle controls HTTPS styles, fonts, and images inside the frame; script execution from themes remains blocked.

## Automated checks

The Vitest corpus covers source preservation (BOM/CRLF, comments, unknown metadata, declaration order, duplicate variables, conditional rules), targeted edits, malformed source, history, dependency inspection, URL rebasing, recursive import compilation/cache/conditions/failures/cycles, the actual MaterialDiscord/system24 configuration files, and the sanitized snapshot's current DOM structure, structural attributes, SVG references, and removal of private identifiers/resources.

Original public theme configuration files are preserved in `test/fixtures/themes` for regression checks. Formatting tools exclude source-preservation fixtures and the generated snapshot.

## Browser validation

Validated against the user's installed theme configuration files, without modifying those installed files:

| Theme           | Loaded preview                                                                                          | Guided edit confirmed in computed styles                                                                      | Export check                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| MaterialDiscord | 5 imported stylesheets; Google Sans Flex font; Material colors and rounded messages/input               | `--message-radius: 18px` → `36px`; actual message corners updated                                             | Byte-for-byte identical except that value                                               |
| system24        | 4 imported stylesheets; DM Mono font; dark surfaces, square corners, panel borders and generated labels | `--bg-4` → `#102a20`, `--border-thickness: 2px` → `4px`; actual chat/sidebar/input colors and borders updated | Byte-for-byte identical except those two values; reimport retained the rendered changes |

Earlier source workflow checks also verified unchanged BOM/CRLF export, custom variables and literal/variable selector bindings, syntax diagnostics and last-valid preview, IndexedDB recovery, parent/frame isolation, and mobile workspace sizing. These establish editing and preview behavior for the checked scenes; they do not certify every third-party theme or client state.

Additional production checks confirmed that system24 loads with no resource alert. The installed Tokyo Night configuration references removed `dyzean.github.io/Tokyo-Night` paths (the main CSS returns HTTP 404); the app reports a failed browser import instead of claiming a complete render. NieR's original host redirects without readable CORS headers: the browser fallback successfully loaded its beige palette and Rodin font while marking source inspection unavailable. This older theme still has selectors for client states/versions absent from the snapshot.

## Live-client comparison after replacing the old snapshot

Inspected the user's signed-in Discord web tab, member list, pinned-message panel, and Appearance settings without sending messages or changing account settings. Returned to the original chat view and removed all temporary reference styles.

At the same 565 × 857 CSS-pixel viewport, the sanitized unthemed fixture exactly matched all 10 measured regions: application grid, sidebar, server rail, channel list, user panel, chat container, chat content, header, composer, and member list. Measurements included bounding rectangles, display/position, grid tracks, padding/margin/gap, font family/size/line height, background, and radius.

Temporarily applied the same compiled MaterialDiscord and system24 CSS to both the live client and fixture, with the member list closed. All nine measured regions matched for each theme. The temporary styles were removed after each comparison. Reference values and results are recorded in [preview-validation.json](preview-validation.json). These checks target structure and computed styles; sample message lengths and image content intentionally differ from the user's conversations.

The app's opaque-origin frame was then checked separately for theme loading, guided edits, member-list toggling, and light/dark appearance. The preview represents the inspected web-client build and captured chat state; future Discord releases, desktop window chrome, voice/video surfaces, settings dialogs, and plugin components require separate updates or scenes.

The final desktop capture was checked at 1280 × 800 with the full composer controls and member list open. Both themes matched all 10 measured regions after allowing the live client to settle; MaterialDiscord’s left-position transition was disabled only for steady-state reference measurement. The preview emulates the client’s measured user-panel height with ResizeObserver and lets the empty Slate composer size naturally instead of keeping its captured inline height. These behaviors fixed the remaining spacing and composer-height discrepancies. CSS transition timing can differ while a background tab is throttled; comparison records use settled states.
