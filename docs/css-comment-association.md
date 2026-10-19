# CSS descriptions in the visual editor

Reviewed the four theme files in the local Vencord themes folder:

| Theme            | Patterns                                                                                | Interpretation                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Material Discord | Headings above contiguous declaration groups; occasional inline exceptions              | All three app font fields inherit `APP FONT SETTINGS`. The following accent heading belongs to the accent fields. Inline exceptions appear after their field's heading. |
| system24         | Short section headings, per-field inline descriptions, consecutive explanatory comments | Fields show their shared heading followed by any inline descriptions. Following fields inherit only the shared heading, until the group ends.                           |
| Tokyo Night      | Rule-opening labels, blank lines, headings above color groups                           | Blank lines prevent a broad `Dark Mode` label from leaking into individual groups; each color group's heading applies to its fields.                                    |
| NieR Light       | Metadata, ASCII art, import notes and a heading outside `:root`                         | Comments outside a rule do not become descriptions of declarations inside it.                                                                                           |

Association is based on PostCSS nodes and source lines, never nearest-text matching:

1. A comment immediately following a declaration on the same line describes only that declaration. Multiple adjacent inline comments are combined.
2. Standalone comments above a contiguous group describe all declarations below them in that group. Consecutive explanatory comments are combined, with multiline text retained.
3. All relevant comments are shown in source order: shared headings first, followed by that field's inline notes. Inline notes never replace the heading or pass to following fields.
4. Blank lines, a new standalone heading, a nested rule or an at-rule end the previous group. A heading separated from the next declaration by a blank line does not attach.
5. A later group's heading never describes the preceding declaration. A previous field's inline comment never becomes the next field's heading.
6. Commented-out custom declarations/imports and separator-only comments are not shown as descriptions. Rule-level metadata and import annotations stay outside field descriptions.

These rules only affect displayed descriptions and search. Source comments, whitespace, line endings and export bytes remain intact. Repeated group descriptions remain visible when a search hides the other members of that group.
