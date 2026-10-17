# Preview compatibility and validation

## Rendering

The preview uses real Discord markup and base CSS captured by [Gibbu/ThemePreview](https://github.com/Gibbu/ThemePreview), pinned at revision `607db5e3e620d4e0851d2d3b443a07a7322ca47a`. The HTML and base CSS are bundled locally; no third-party preview page or upstream JavaScript runs in the app. See [snapshot provenance and regeneration](../src/features/preview/fixture/NOTICE.md).

The previous synthetic fixture could not match real theme selectors. The new document retains exact captured class names, DOM nesting, default tokens, sample messages, embeds, member list, and controls. The captured layout module's `_c48ade` classes also receive `__5e434` aliases, supporting the newer selectors used by system24/midnight while preserving the captured base CSS.

A virtual desktop canvas fits into the available pane, preventing Discord's sidebars from squeezing chat at narrow editor widths. Switch to 100% to scroll the full canvas.

This remains a versioned client snapshot. New Discord class hashes, unmounted dialogs/settings, plugin UI, desktop transparency, and live behavior require additional fixtures or updates. An exact match with an installed Discord client is not guaranteed. Local-selector match counts indicate DOM query matches, not cascade winners, conditional activity, or overall theme compatibility. Imported selectors are not included in that count. Validate exported themes in the target client.

## Theme imports

HTTPS resources are enabled by default. The preview compiler fetches CSS imports recursively and inlines them into a preview-only stylesheet, before local overrides. It rebases relative asset/import URLs and retains import `layer`, `supports`, and media conditions. User source and exported imports remain unchanged.

Successful responses are cached during the preview session. Failures are visible with the failing URL and a retry action. Paused imports produce a prominent incomplete-preview notice with an action to load theme styles. Source-reading requests omit credentials and referrers. When network/CORS errors prevent reading CSS, the preview falls back to the original native CSS import graph, preserving ordering and conditions. Browser style load/error events distinguish successful rendering from a failed load; nested import inspection/counts are unavailable in this fallback. Native resource requests follow the browser’s normal CSS loading rules. Offline hosts, missing files, or host restrictions can still block rendering.

Source-reading bounds: 15 seconds per stylesheet request, 3 MB per response, 8 MB combined CSS, 40 imports, and a nesting-depth bound. Cycles are detected. Native fallback loads are managed by the browser rather than these source-inspection limits. Local companion files are not resolved from a dropped file; supply an original HTTPS source URL for relative imports. Imported definitions are inspectable but not editable dependencies; add local overrides or edit the source project separately.

## Guided editor

All scopes is the default variables view, including `body` settings and `:root` colors. Individual scopes remain selectable. Edits patch the specific original declaration; duplicate names, conditional scopes, and dark/light settings remain distinct. Unknown properties stay editable in the CSS editor.

Literal colors, including `oklch()`, have a color picker. Merely opening the picker does not normalize the source. Changing the picker emits a hex color and preserves alpha; CSS expressions and variable references remain text/binding controls.

## Isolation

The iframe uses `sandbox="allow-scripts"` without same-origin privileges. The captured document is sanitized to remove upstream scripts, resource links, metadata, and event handlers. Its CSP permits only the app's nonced bootstrap script. Theme text is assigned through a style node's `textContent`, never interpolated as HTML. The bootstrap checks the parent window and per-instance token, then transfers a dedicated MessageChannel. Subsequent updates validate payload types, sizes, and revision IDs. Theme CSS cannot style or read the editor document. The remote-resource toggle controls HTTPS styles, fonts, and images inside the frame; script execution from themes remains blocked.

## Automated checks

The Vitest corpus covers source preservation (BOM/CRLF, comments, unknown metadata, declaration order, duplicate variables, conditional rules), targeted edits, malformed source, history, dependency inspection, URL rebasing, recursive import compilation/cache/conditions/failures/cycles, the actual MaterialDiscord/system24 configuration files, and the sanitized snapshot's expected DOM structure and aliases.

Original public theme configuration files are preserved in `test/fixtures/themes` for regression checks. Formatting tools exclude source-preservation fixtures and the generated snapshot.

## Browser validation

Validated against the user's installed theme configuration files, without modifying those installed files:

| Theme           | Loaded preview                                                                                          | Guided edit confirmed in computed styles                                                                      | Export check                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| MaterialDiscord | 5 imported stylesheets; Google Sans Flex font; Material colors and rounded messages/input               | `--message-radius: 18px` → `36px`; actual message corners updated                                             | Byte-for-byte identical except that value                                               |
| system24        | 4 imported stylesheets; DM Mono font; dark surfaces, square corners, panel borders and generated labels | `--bg-4` → `#102a20`, `--border-thickness: 2px` → `4px`; actual chat/sidebar/input colors and borders updated | Byte-for-byte identical except those two values; reimport retained the rendered changes |

Earlier source workflow checks also verified unchanged BOM/CRLF export, custom variables and literal/variable selector bindings, syntax diagnostics and last-valid preview, IndexedDB recovery, parent/frame isolation, and mobile workspace sizing. These establish editing and preview behavior for the checked scenes; they do not certify every third-party theme or client state.

Additional production checks confirmed that system24 loads with no resource alert. The installed Tokyo Night configuration references removed `dyzean.github.io/Tokyo-Night` paths (the main CSS returns HTTP 404); the app reports a failed browser import instead of claiming a complete render. NieR's original host redirects without readable CORS headers: the browser fallback successfully loaded its beige palette and Rodin font while marking source inspection unavailable. This older theme still has selectors for client states/versions absent from the snapshot.
