# Discord preview snapshot

`discord-snapshot.html` is generated from the Discord DOM and base CSS snapshot in [Gibbu/ThemePreview](https://github.com/Gibbu/ThemePreview), revision `607db5e3e620d4e0851d2d3b443a07a7322ca47a`, retrieved 2026-10-17. The upstream project captures Discord markup, styles, sample content, and references to Discord assets. Discord assets belong to their respective owners. The upstream repository does not declare a license; this attribution does not relicense that material.

Run `bun scripts/update-preview.ts` to reproduce the pinned snapshot. The generator strips upstream scripts, links, metadata, and event attributes; rebases Discord asset URLs; annotates inspectable regions; and adds aliases from the captured `_c48ade` layout module to the current `__5e434` family used by current themes. Both class families remain on the same nodes so captured base styles and newer theme selectors can apply. It does not rewrite a user's theme or substitute theme-specific colors.

The app inserts its own CSP and nonced MessageChannel bootstrap. Theme CSS is supplied only through a style node's textContent. No user Discord login, chat history, or local Vencord data is captured.
