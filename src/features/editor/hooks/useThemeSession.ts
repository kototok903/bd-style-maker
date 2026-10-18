import { useEffect, useReducer, useRef, useState } from "react";

import {
  initialSession,
  sessionReducer,
} from "@/features/editor/lib/editor-history";
import { readDraft, saveDraft } from "@/features/projects/lib/draft-storage";

export function useThemeSession() {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState("");
  const writes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    readDraft()
      .then((project) => {
        if (!active) return;
        if (project) {
          dispatch({ type: "open", project });
        }
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Draft storage unavailable. Export to keep your work.",
          );
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      writes.current = writes.current
        .catch(() => {})
        .then(() => saveDraft(state.project));
      writes.current
        .then(() => setStorageError(""))
        .catch(() =>
          setStorageError(
            "Draft could not be saved. Export to keep your work.",
          ),
        );
    }, 400);
    return () => clearTimeout(timer);
  }, [state.project, hydrated]);
  const dirty =
    !!state.project && state.project.text !== state.project.exportedText;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  return {
    state,
    dispatch,
    hydrated,
    storageError,
    dirty,
  };
}
