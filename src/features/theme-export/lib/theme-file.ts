import { exportFileName } from "@/features/theme/lib/theme-source";

export async function readThemeFile(file: File) {
  if (!/\.css$/i.test(file.name))
    throw new Error("Choose a .theme.css or .css file.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error("Choose a stylesheet smaller than 2 MB.");
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    throw new Error(
      "This file is not UTF-8. Save it as UTF-8 in a text editor and try again.",
    );
  }
}

export function downloadTheme(text: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/css;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileName(fileName);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
