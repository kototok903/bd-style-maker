import { diffLines } from "diff";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  metadataFields,
  updateMetadata,
} from "@/features/theme/lib/theme-source";
import type { ThemeAnalysis, ThemeProject } from "@/features/theme/theme-types";
import { downloadTheme } from "@/features/theme-export/lib/theme-file";
import { cn } from "@/lib/utils";

export function MetadataDialog({
  open,
  onOpenChange,
  analysis,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: ThemeAnalysis;
  onEdit: (text: string) => void;
}) {
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Theme information</DialogTitle>
          <DialogDescription>
            Edit the leading metadata comment. Original credits and unknown
            fields are kept.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {[...metadataFields, "website", "source"].map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`meta-${key}`}>
                {key[0].toUpperCase() + key.slice(1)}
                {metadataFields.some((f) => f === key) ? " *" : ""}
              </FieldLabel>
              <Input
                id={`meta-${key}`}
                defaultValue={analysis.metadata[key] ?? ""}
                key={`${open}-${key}-${analysis.metadata[key]}`}
                onBlur={(e) => {
                  if (e.target.value === (analysis.metadata[key] ?? "")) return;
                  try {
                    onEdit(
                      updateMetadata(analysis.source, key, e.target.value),
                    );
                    setError("");
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not update metadata.",
                    );
                  }
                }}
              />
            </Field>
          ))}
          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
  project,
  analysis,
  onExported,
  onMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ThemeProject;
  analysis: ThemeAnalysis;
  onExported: (text: string, fileName: string) => void;
  onMessage: (message: string) => void;
}) {
  const [fileName, setFileName] = useState(project.fileName);
  const missing = metadataFields.filter((key) => !analysis.metadata[key]);
  const warning = !!analysis.diagnostic || !!missing.length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ready for your Discord.</DialogTitle>
          <DialogDescription>
            Export your current source as a BetterDiscord theme.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="export-name">File name</FieldLabel>
            <Input
              id="export-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        {warning && (
          <Alert variant="destructive">
            <AlertTitle>Review before installing</AlertTitle>
            <AlertDescription>
              {analysis.diagnostic
                ? `CSS syntax: ${analysis.diagnostic.message}. `
                : ""}
              {missing.length
                ? `Missing metadata: ${missing.join(", ")}. `
                : ""}
              You can still download the exact source to keep your work.
            </AlertDescription>
          </Alert>
        )}
        <div className="export-summary">
          <span>Original CSS, comments, and metadata</span>
          <span>{analysis.imports.length} remote imports retained</span>
          <span>No editor-specific format</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The preview is approximate. Check the result in BetterDiscord after
          installing your theme.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(project.text);
                onMessage("CSS copied to clipboard.");
              } catch {
                onMessage(
                  "Clipboard access failed. Download the file instead.",
                );
              }
            }}
          >
            <CopyIcon data-icon="inline-start" />
            Copy CSS
          </Button>
          <Button
            disabled={!fileName.trim()}
            onClick={() => {
              downloadTheme(project.text, fileName);
              onExported(project.text, fileName);
              onOpenChange(false);
            }}
          >
            <DownloadIcon data-icon="inline-start" />
            {warning ? "Download source" : "Download theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PasteDialog({
  open,
  onOpenChange,
  onOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (text: string, name: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start with your CSS</DialogTitle>
          <DialogDescription>
            Paste a whole theme or a snippet. You can add metadata later.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="paste-css">Stylesheet</FieldLabel>
            <Textarea
              id="paste-css"
              className="min-h-64"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={":root {\n  --brand-500: #a7b7ff;\n}"}
              spellCheck={false}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            disabled={!text.trim() || text.length > 2 * 1024 * 1024}
            onClick={() => {
              onOpen(text, "Pasted.theme.css");
              setText("");
              onOpenChange(false);
            }}
          >
            Open stylesheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChangesDialog({
  open,
  onOpenChange,
  project,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ThemeProject;
  onReset: () => void;
}) {
  const changes = useMemo(
    () =>
      open
        ? diffLines(project.original, project.text, {
            timeout: 200,
            maxEditLength: 20000,
          })
        : [],
    [project.original, project.text, open],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Changes since opening</DialogTitle>
          <DialogDescription>
            {project.fileName} · Reset is undoable.
          </DialogDescription>
        </DialogHeader>
        <div className="diff-view">
          {project.original === project.text ? (
            <p className="p-6 text-sm text-muted-foreground">
              No changes yet. Your original source is intact.
            </p>
          ) : changes ? (
            changes.map((change, index) => (
              <pre
                key={index}
                className={cn(
                  "diff-line",
                  change.added && "diff-added",
                  change.removed && "diff-removed",
                )}
              >
                <span
                  aria-label={
                    change.added
                      ? "Added"
                      : change.removed
                        ? "Removed"
                        : "Unchanged"
                  }
                >
                  {change.added ? "+" : change.removed ? "−" : " "}
                </span>
                {change.value}
              </pre>
            ))
          ) : (
            <p className="p-6">
              This diff is too large to display. Both versions remain available
              in the workspace.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
            disabled={project.text === project.original}
          >
            Reset to original
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
