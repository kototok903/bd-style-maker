import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

// Graphite: the palette approved in the editor theme comparison.
const palette = {
  foreground: "#e8e9f0",
  comment: "#adb0bf",
  keyword: "#c6b0f5",
  string: "#a6d5b2",
  number: "#edc18f",
  selector: "#b6c4ff",
  property: "#d4d6ec",
  punctuation: "#b9bdce",
};

export const graphiteTheme = [
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.comment, color: palette.comment },
      {
        tag: [tags.keyword, tags.modifier, tags.definitionKeyword],
        color: palette.keyword,
      },
      { tag: [tags.string, tags.url], color: palette.string },
      {
        tag: [tags.number, tags.unit, tags.color, tags.bool, tags.atom],
        color: palette.number,
      },
      {
        tag: [tags.className, tags.tagName, tags.attributeName],
        color: palette.selector,
      },
      { tag: [tags.propertyName, tags.variableName], color: palette.property },
      { tag: [tags.operator, tags.punctuation], color: palette.punctuation },
      { tag: tags.invalid, color: "#f093a5" },
    ]),
  ),
  EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: "12px",
        backgroundColor: "var(--editor-surface)",
        color: palette.foreground,
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "var(--font-mono)",
        lineHeight: "1.85",
      },
      ".cm-content": { padding: "16px 0", caretColor: palette.foreground },
      ".cm-gutters": {
        background: "var(--editor-surface)",
        color: palette.comment,
        border: "none",
        paddingRight: "7px",
      },
      // Selections are drawn below line backgrounds. This translucent overlay
      // produces Graphite's #2c2e38 active line without hiding selected text.
      ".cm-activeLine, .cm-activeLineGutter": { background: "#4c526c33" },
      ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground":
        {
          background: "var(--editor-selection)",
        },
      ".cm-content ::selection": { background: "var(--editor-selection)" },
      "&.cm-focused": { outline: "none" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: palette.foreground },
      ".cm-selectionMatch": {
        backgroundColor: "#a7b7ff26",
        outline: "1px solid #a7b7ff66",
      },
      ".cm-searchMatch": {
        backgroundColor: "#edc18f26",
        outline: "1px solid #edc18f66",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: "#edc18f40",
      },
      ".cm-matchingBracket": {
        backgroundColor: "#a7b7ff26",
        outline: "1px solid #a7b7ff66",
      },
      ".cm-panels, .cm-tooltip": {
        background: "var(--popover)",
        color: palette.foreground,
        borderColor: "var(--border)",
      },
      ".cm-search input, .cm-search button": {
        background: "var(--editor-surface)",
        color: palette.foreground,
        border: "1px solid var(--input)",
      },
    },
    { dark: true },
  ),
];
