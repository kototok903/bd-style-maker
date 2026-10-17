import { openDB } from "idb";

import type { ThemeProject } from "@/features/theme/theme-types";

const database = () =>
  openDB("bd-style-maker", 1, {
    upgrade(db) {
      db.createObjectStore("drafts");
    },
  });

export function isThemeProject(value: unknown): value is ThemeProject {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    ["id", "fileName", "original", "text", "exportedText"].every(
      (k) => typeof p[k] === "string",
    ) && typeof p.updatedAt === "number"
  );
}

export async function readDraft(): Promise<ThemeProject | null> {
  const db = await database();
  try {
    const draft: unknown = await db.get("drafts", "active");
    return isThemeProject(draft) ? draft : null;
  } finally {
    db.close();
  }
}

export async function saveDraft(project: ThemeProject | null) {
  const db = await database();
  try {
    if (project) await db.put("drafts", project, "active");
    else await db.delete("drafts", "active");
  } finally {
    db.close();
  }
}
