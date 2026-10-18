import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { setDiagnostics } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { useEffect, useRef } from "react";

import type { ThemeDiagnostic } from "@/features/theme/theme-types";

type Props = {
  text: string;
  diagnostic: ThemeDiagnostic | null;
  jump: { offset: number; nonce: number } | null;
  onChange: (text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
};

export function SourceEditor({
  text,
  diagnostic,
  jump,
  onChange,
  onUndo,
  onRedo,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onUndo, onRedo });
  useEffect(() => {
    callbacks.current = { onChange, onUndo, onRedo };
  }, [onChange, onUndo, onRedo]);
  const initial = useRef(text);
  const currentText = useRef(text);
  useEffect(() => {
    currentText.current = text;
  }, [text]);
  useEffect(() => {
    if (!container.current) return;
    const eol = initial.current.includes("\r\n") ? "\r\n" : "\n";
    const view = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: initial.current,
        extensions: [
          EditorState.lineSeparator.of(eol),
          css(),
          lineNumbers(),
          foldGutter(),
          drawSelection(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          indentOnInput(),
          bracketMatching(),
          highlightSelectionMatches(),
          syntaxHighlighting(defaultHighlightStyle),
          EditorView.contentAttributes.of({
            "aria-label": "Theme CSS source",
            spellcheck: "false",
          }),
          keymap.of([
            {
              key: "Mod-z",
              run: () => {
                callbacks.current.onUndo();
                return true;
              },
            },
            {
              key: "Mod-Shift-z",
              run: () => {
                callbacks.current.onRedo();
                return true;
              },
            },
            {
              key: "Mod-y",
              run: () => {
                callbacks.current.onRedo();
                return true;
              },
            },
            ...defaultKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              update.transactions.some(
                (t) =>
                  t.isUserEvent("input") ||
                  t.isUserEvent("delete") ||
                  t.isUserEvent("move"),
              )
            )
              callbacks.current.onChange(update.state.sliceDoc());
          }),
          EditorView.theme(
            {
              "&": {
                height: "100%",
                fontSize: "12px",
                backgroundColor: "var(--editor-surface)",
                color: "var(--foreground)",
              },
              ".cm-scroller": {
                overflow: "auto",
                fontFamily: "var(--font-mono)",
                lineHeight: "1.85",
              },
              ".cm-content": {
                padding: "16px 0",
                caretColor: "var(--foreground)",
              },
              ".cm-gutters": {
                background: "var(--editor-surface)",
                color: "var(--muted-foreground)",
                border: "none",
                paddingRight: "7px",
              },
              ".cm-activeLine": {
                // CodeMirror draws selections underneath line backgrounds.
                background:
                  "color-mix(in srgb, var(--accent) 55%, transparent)",
              },
              ".cm-activeLineGutter": {
                background: "var(--accent)",
              },
              ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground":
                {
                  background: "var(--editor-selection)",
                },
              "&.cm-focused": { outline: "none" },
              ".cm-cursor": { borderLeftColor: "var(--foreground)" },
              ".cm-panels": {
                background: "var(--card)",
                color: "var(--foreground)",
              },
              ".cm-search input": {
                background: "var(--background)",
                color: "var(--foreground)",
              },
            },
            { dark: true },
          ),
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.sliceDoc() !== text)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
  }, [text]);
  useEffect(() => {
    const view = editor.current;
    if (!view) return;
    const line = diagnostic
      ? view.state.doc.line(Math.min(diagnostic.line, view.state.doc.lines))
      : null;
    view.dispatch(
      setDiagnostics(
        view.state,
        line
          ? [
              {
                from: line.from,
                to: line.to,
                severity: "error",
                message: diagnostic!.message,
              },
            ]
          : [],
      ),
    );
  }, [diagnostic]);
  useEffect(() => {
    const view = editor.current;
    if (!view || !jump) return;
    const offset = currentText.current
      .slice(0, jump.offset)
      .replace(/\r\n/g, "\n").length;
    const from = Math.min(offset, view.state.doc.length);
    view.dispatch({
      selection: { anchor: from },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    view.focus();
  }, [jump]);
  return (
    <div className="min-h-0 flex-1 overflow-hidden border-y" ref={container} />
  );
}
