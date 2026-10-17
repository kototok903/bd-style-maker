# V1 compatibility and validation

## Preview decision

BDThemeEditor's source points to an external ThemePreview iframe. Its design informed the preview approach, but that third-party document is not used at runtime or copied into this app. The v1 fixture is an original bundled document with synthetic class names and a deliberately limited set of Discord-compatible variable/selector conventions.

This removes a runtime dependency on a third-party preview service. It does **not** establish fidelity for arbitrary Discord themes. Exact hashed classes, Discord DOM nesting, plugin UI, and operating-system transparency remain outside this fixture. Validation against a live BetterDiscord client has not been performed.

## Supported fixture conventions

| Pattern                                                                   | Fixture support                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `:root`, `.theme-dark`, `.theme-light`                                    | Present on the fixture root; appearance can be switched independently          |
| `--background-primary`, `--background-secondary`, `--background-tertiary` | Chat, sidebar, server rail/input surfaces                                      |
| `--background-base-low`                                                   | Optional chat surface override                                                 |
| `--text-normal`, `--text-muted`, `--brand-500`, `--font-primary`          | Text, secondary text, accents, fonts                                           |
| `[class*="message_"]`                                                     | Sample message rows                                                            |
| `[class*="channelTextArea_"]`                                             | Message input                                                                  |
| `[class*="embedFull_"]`                                                   | Sample embed                                                                   |
| `[class*="sidebar_"]`, `[class*="members_"]`, `[class*="chat_"]`          | Channel list, member list, chat                                                |
| `#app-mount`, general HTML selectors                                      | Available inside the fixture only                                              |
| Arbitrary exact Discord class hashes                                      | No fidelity guarantee                                                          |
| Newer/third-party theme-specific variables                                | Preserved/editable; only affect preview if consumed by matching authored rules |

Member/sidebar visibility adapts to preview width. Match counts indicate query matches against the mounted DOM, not cascade winners, conditional-rule activity, or an overall compatibility score. Preview selection opens the first exact corresponding local selector when one exists. More complex selectors remain accessible through the guided scope selector and CSS editor.

## Isolation

The iframe uses `sandbox="allow-scripts"` without same-origin privileges. Its CSP permits only the trusted nonced bootstrap script. Theme text is assigned through a style node's `textContent`, never interpolated as HTML. Bootstrap checks the parent window and per-instance token, then transfers a dedicated MessageChannel. Subsequent messages validate payload types, lengths, and monotonic revision IDs. External styles/fonts/images require the explicit resource toggle; scripts and connections remain blocked.

## Automated coverage

The Vitest corpus covers preservation of UTF-8 BOM/CRLF, comments and `!important` notation, duplicate and case-sensitive variables, nested and conditional rules, multiline values, semicolons in strings/data URLs, stale source references, declaration/rule injection rejection, variable insertion/removal, malformed-source retention, unknown metadata preservation, interleaved/coalesced history, dependency cycles/failures, and preview-only URL rebasing with import conditions.

`test/fixtures/Unlisted.theme.css` is intentionally an unformatted BOM/CRLF fixture; formatting tools exclude it.

## Browser checks performed

- Opened the unrecognized fixture without any `@BDEditor` marker; exported it unchanged and compared all 640 bytes against the original, including BOM and CRLF.
- Changed a starter variable through guided controls and verified the source and isolated preview connection updated.
- Created a custom variable, edited selector radius as a literal and then rebound it to `var(--radius)`.
- Introduced a syntax error in CodeMirror, checked the diagnostic and stale-preview label, then undid the change.
- Opened a second workspace tab to verify recovery of the edited IndexedDB draft.
- Confirmed the parent cannot read the opaque-origin frame document and theme CSS does not change the editor background.
- Checked desktop and mobile layout dimensions; fixed the resizable library's outer-wrapper sizing for stacked mobile panes.

These checks establish the local editing workflow. They do not certify third-party themes against the actual Discord client.
