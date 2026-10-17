import type { ThemeProject } from "@/features/theme/theme-types";

export type EditorSession = {
  project: ThemeProject | null;
  past: string[];
  future: string[];
  group: string | null;
  editedAt: number;
};
export type SessionAction =
  | { type: "open"; project: ThemeProject | null }
  | { type: "edit"; text: string; group?: string; now: number }
  | { type: "undo" | "redo" }
  | { type: "exported"; text: string }
  | { type: "rename"; fileName: string };

export const initialSession: EditorSession = {
  project: null,
  past: [],
  future: [],
  group: null,
  editedAt: 0,
};

export function sessionReducer(
  state: EditorSession,
  action: SessionAction,
): EditorSession {
  if (action.type === "open")
    return { ...initialSession, project: action.project };
  const project = state.project;
  if (!project) return state;
  if (action.type === "edit") {
    if (action.text === project.text) return state;
    const merge =
      action.group &&
      state.group === action.group &&
      action.now - state.editedAt < 700;
    return {
      project: { ...project, text: action.text, updatedAt: action.now },
      past: merge ? state.past : [...state.past, project.text].slice(-100),
      future: [],
      group: action.group ?? null,
      editedAt: action.now,
    };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous === undefined
      ? state
      : {
          project: { ...project, text: previous, updatedAt: Date.now() },
          past: state.past.slice(0, -1),
          future: [project.text, ...state.future],
          group: null,
          editedAt: 0,
        };
  }
  if (action.type === "redo") {
    const next = state.future[0];
    return next === undefined
      ? state
      : {
          project: { ...project, text: next, updatedAt: Date.now() },
          past: [...state.past, project.text].slice(-100),
          future: state.future.slice(1),
          group: null,
          editedAt: 0,
        };
  }
  if (action.type === "exported")
    return { ...state, project: { ...project, exportedText: action.text } };
  if (action.type === "rename")
    return { ...state, project: { ...project, fileName: action.fileName } };
  return state;
}

export function createProject(text: string, fileName: string): ThemeProject {
  return {
    id: crypto.randomUUID(),
    fileName,
    text,
    original: text,
    exportedText: text,
    updatedAt: Date.now(),
  };
}
