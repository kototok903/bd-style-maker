import {
  BracesIcon,
  CheckIcon,
  Code2Icon,
  DownloadIcon,
  FileCode2Icon,
  FilePenLineIcon,
  FileTextIcon,
  FolderOpenIcon,
  GitCompareArrowsIcon,
  HistoryIcon,
  LinkIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  Redo2Icon,
  SlidersHorizontalIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DependenciesDialog } from "@/features/dependencies/components/DependenciesDialog";
import { previewCss } from "@/features/dependencies/lib/dependencies";
import { GuidedEditor } from "@/features/editor/components/GuidedEditor";
import { OpenTheme } from "@/features/editor/components/OpenTheme";
import {
  ChangesDialog,
  ExportDialog,
  MetadataDialog,
  PasteDialog,
} from "@/features/editor/components/WorkspaceDialogs";
import { useThemeSession } from "@/features/editor/hooks/useThemeSession";
import { createProject } from "@/features/editor/lib/editor-history";
import { ThemePreview } from "@/features/preview/components/ThemePreview";
import { emptyTheme, starterTheme } from "@/features/theme/lib/starter-theme";
import {
  analyzeTheme,
  exportFileName,
} from "@/features/theme/lib/theme-source";
import type { ThemeProject } from "@/features/theme/theme-types";
import {
  downloadTheme,
  readThemeFile,
} from "@/features/theme-export/lib/theme-file";
import { cn } from "@/lib/utils";

const emptyAnalysis = analyzeTheme("");
const SourceEditor = lazy(() =>
  import("@/features/editor/components/SourceEditor").then((module) => ({
    default: module.SourceEditor,
  })),
);

export function AppShell() {
  const {
    state,
    dispatch,
    hydrated,
    storage,
    dirty,
    recovered,
    dismissRecovery,
  } = useThemeSession();
  const project = state.project;
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState("guided");
  const [selectedRule, setSelectedRule] = useState("");
  const [jump, setJump] = useState<{ offset: number; nonce: number } | null>(
    null,
  );
  const [dialog, setDialog] = useState<
    "metadata" | "imports" | "export" | "paste" | "changes" | null
  >(null);
  const [external, setExternal] = useState(false);
  const [base, setBase] = useState("");
  const [compare, setCompare] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<ThemeProject | null>(null);
  const [lastValid, setLastValid] = useState(emptyAnalysis);
  const analysis = useMemo(
    () => analyzeTheme(project?.text ?? ""),
    [project?.text],
  );
  const original = useMemo(
    () => analyzeTheme(project?.original ?? ""),
    [project?.original],
  );
  useEffect(() => {
    if (!analysis.diagnostic) setLastValid(analysis);
  }, [analysis]);
  const validAnalysis = analysis.diagnostic ? lastValid : analysis;
  const previewAnalysis = useMemo(() => {
    const source = compare ? (project?.original ?? "") : validAnalysis.source;
    return analyzeTheme(previewCss(source, base));
  }, [compare, project?.original, validAnalysis.source, base]);
  const edit = useCallback(
    (text: string, group?: string) =>
      dispatch({ type: "edit", text, group, now: Date.now() }),
    [dispatch],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);
  const jumpTo = (offset: number) => {
    setMode("css");
    setCollapsed(false);
    setJump({ offset, nonce: Date.now() });
  };

  function activate(next: ThemeProject) {
    dispatch({ type: "open", project: next });
    setMode(analyzeTheme(next.text).diagnostic ? "css" : "guided");
    setSelectedRule("");
    setJump(null);
    setLastValid(emptyAnalysis);
    setBase("");
    setExternal(false);
    setCompare(false);
    setCollapsed(false);
    setError("");
    setMessage(`Opened ${next.fileName}.`);
    dismissRecovery();
  }
  function requestOpen(text: string, fileName: string) {
    const next = createProject(text, fileName);
    if (dirty) setPending(next);
    else activate(next);
  }
  async function openFile(file?: File) {
    if (!file) return;
    try {
      requestOpen(await readThemeFile(file), file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    }
  }
  const requestExport = useCallback(() => {
    if (project) setDialog("export");
  }, [project]);
  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        requestExport();
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        input.current?.click();
      }
      const target = event.target as HTMLElement;
      if (target.closest(".cm-editor,input,textarea,[contenteditable=true]"))
        return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [undo, redo, requestExport]);

  function selectPreview(selector: string) {
    const matching = analysis.rules.find((r) => r.selector === selector);
    if (matching) {
      setSelectedRule(matching.id);
      setMode("guided");
      setCollapsed(false);
      setMessage(
        `Selected ${selector}. Choose Selector styles to edit its properties.`,
      );
    } else
      setMessage(
        `No local rule for ${selector}. Add this selector in the guided editor or write it in CSS.`,
      );
  }
  function tool(
    label: string,
    icon: React.ReactNode,
    action: () => void,
    disabled = false,
  ) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              onClick={action}
              disabled={disabled}
            />
          }
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }
  const ruleId =
    analysis.rules.find((r) => r.id === selectedRule)?.id ??
    analysis.rules.find((r) => r.selector === ":root")?.id ??
    analysis.rules[0]?.id ??
    "";

  return (
    <TooltipProvider>
      <div
        className={cn("app-shell", dragging && "is-dragging")}
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (hydrated) void openFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept=".theme.css,.css,text/css"
          className="sr-only"
          ref={input}
          aria-label="Open theme file"
          onChange={(e) => {
            void openFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          disabled={!hydrated}
        />
        <header className="app-header">
          <div className="app-identity">
            <div className="app-logo">
              <BracesIcon />
            </div>
            <div>
              <strong>BD Style Maker</strong>
              <span className="app-tagline">A little more like you.</span>
            </div>
          </div>
          {project && (
            <div className="open-file">
              <FileCode2Icon />
              <span>{project.fileName}</span>
              {dirty && (
                <span className="unsaved-dot" title="Changes not exported" />
              )}
            </div>
          )}
          <div className="header-actions">
            {project && (
              <>
                {tool("New theme", <PlusIcon />, () =>
                  requestOpen(emptyTheme, "Untitled.theme.css"),
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => input.current?.click()}
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  <span className="optional-label">Open theme</span>
                </Button>
                <Button size="sm" onClick={requestExport}>
                  <DownloadIcon data-icon="inline-start" />
                  <span>Export</span>
                </Button>
              </>
            )}
            {!project && <Badge variant="outline">Local workspace</Badge>}
          </div>
        </header>
        {error && (
          <Alert variant="destructive" className="app-notice">
            <AlertDescription className="flex items-center justify-between gap-3">
              {error}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <XIcon />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {recovered && (
          <Alert className="app-notice">
            <HistoryIcon />
            <AlertDescription className="flex items-center justify-between gap-3">
              Your last workspace was recovered from this device.
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Dismiss recovery notice"
                onClick={dismissRecovery}
              >
                <XIcon />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!project ? (
          <OpenTheme
            disabled={!hydrated}
            onFile={() => input.current?.click()}
            onPaste={() => setDialog("paste")}
            onSample={() => requestOpen(starterTheme, "Midnight.theme.css")}
            onNew={() => requestOpen(emptyTheme, "Untitled.theme.css")}
          />
        ) : (
          <>
            <div className="workspace-commandbar">
              <div className="document-tools">
                {tool(
                  "Undo (⌘/Ctrl Z)",
                  <Undo2Icon />,
                  undo,
                  !state.past.length,
                )}
                {tool(
                  "Redo (⌘/Ctrl Shift Z)",
                  <Redo2Icon />,
                  redo,
                  !state.future.length,
                )}
                <span className="toolbar-divider" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog("metadata")}
                >
                  <FileTextIcon data-icon="inline-start" />
                  <span className="optional-label">Theme info</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog("imports")}
                >
                  <LinkIcon data-icon="inline-start" />
                  <span className="optional-label">Imports</span>
                  {analysis.imports.length > 0 && (
                    <Badge variant="secondary">{analysis.imports.length}</Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog("changes")}
                >
                  <FilePenLineIcon data-icon="inline-start" />
                  <span className="optional-label">Changes</span>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={compare ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={compare}
                  onClick={() => setCompare(!compare)}
                >
                  <GitCompareArrowsIcon data-icon="inline-start" />
                  <span className="optional-label">
                    {compare ? "Viewing original" : "Compare original"}
                  </span>
                </Button>
                {tool(
                  collapsed ? "Show editor" : "Hide editor",
                  collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />,
                  () => setCollapsed(!collapsed),
                )}
              </div>
            </div>
            <div
              className={cn("workspace-body", collapsed && "editor-collapsed")}
            >
              <ResizablePanelGroup
                orientation="horizontal"
                className="workspace-panels"
              >
                <ResizablePanel
                  id="editor"
                  defaultSize="31%"
                  minSize="310px"
                  maxSize="65%"
                  className="editor-panel"
                >
                  <Tabs
                    value={mode}
                    onValueChange={setMode}
                    className="editor-tabs"
                  >
                    <div className="editor-mode-bar">
                      <TabsList className="w-full">
                        <TabsTrigger value="guided">
                          <SlidersHorizontalIcon />
                          Guided editor
                        </TabsTrigger>
                        <TabsTrigger value="css">
                          <Code2Icon />
                          CSS editor
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="guided" className="min-h-0">
                      <ScrollArea className="h-full">
                        <GuidedEditor
                          key={project.id}
                          analysis={analysis}
                          original={original}
                          selectedRule={ruleId}
                          onSelectRule={setSelectedRule}
                          onEdit={edit}
                          onJump={jumpTo}
                        />
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="css" className="source-tab">
                      <div className="source-file-bar">
                        <span>
                          <span className="source-file-dot" />
                          {project.fileName}
                        </span>
                        <span>CSS</span>
                      </div>
                      <Suspense
                        fallback={
                          <div className="source-editor p-5 text-sm text-muted-foreground">
                            Opening CSS editor…
                          </div>
                        }
                      >
                        <SourceEditor
                          key={project.id}
                          text={project.text}
                          diagnostic={analysis.diagnostic}
                          jump={jump}
                          onChange={(text) => edit(text, "typing")}
                          onUndo={undo}
                          onRedo={redo}
                        />
                      </Suspense>
                      {analysis.diagnostic && (
                        <div className="source-diagnostic" role="alert">
                          Line {analysis.diagnostic.line}:
                          {analysis.diagnostic.column} ·{" "}
                          {analysis.diagnostic.message}
                        </div>
                      )}
                      <div className="source-bottom">
                        Full source access{" "}
                        <span>Find ⌘/Ctrl F · Indent Tab</span>
                      </div>
                    </TabsContent>
                  </Tabs>
                </ResizablePanel>
                <ResizableHandle className="editor-resize" />
                <ResizablePanel id="preview" minSize="35%">
                  <ThemePreview
                    analysis={previewAnalysis}
                    stale={!!analysis.diagnostic && !compare}
                    external={external}
                    original={
                      compare ? previewCss(project.original, base) : null
                    }
                    onSelect={selectPreview}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </>
        )}
        <footer className="app-footer">
          <span className="storage-state">
            <CheckIcon />
            {hydrated ? storage : "Loading local workspace…"}
          </span>
          <span className="footer-message" role="status" aria-live="polite">
            {message ||
              (project
                ? `${analysis.variables.length} variables · ${analysis.rules.length} rules · UTF-8`
                : "Made for your own CSS.")}
          </span>
          <span className="footer-shortcut">
            {project ? "⌘/Ctrl S to export" : "Files stay on your device"}
          </span>
        </footer>
        {dragging && (
          <div className="drop-overlay">
            <FolderOpenIcon />
            <strong>Drop to open your theme</strong>
            <span>.theme.css or .css · up to 2 MB</span>
          </div>
        )}
        <PasteDialog
          open={dialog === "paste"}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          onOpen={requestOpen}
        />
        {project && (
          <>
            <MetadataDialog
              open={dialog === "metadata"}
              onOpenChange={(open) => {
                if (!open) setDialog(null);
              }}
              analysis={analysis}
              onEdit={edit}
            />
            <DependenciesDialog
              open={dialog === "imports"}
              onOpenChange={(open) => {
                if (!open) setDialog(null);
              }}
              imports={analysis.imports}
              external={external}
              onExternalChange={setExternal}
              base={base}
              onBaseChange={setBase}
            />
            {dialog === "export" && (
              <ExportDialog
                open
                onOpenChange={(open) => {
                  if (!open) setDialog(null);
                }}
                project={project}
                analysis={analysis}
                onExported={(text, name) => {
                  dispatch({ type: "exported", text });
                  dispatch({ type: "rename", fileName: exportFileName(name) });
                  setMessage(
                    "Theme exported. Your source stays available here.",
                  );
                }}
                onMessage={setMessage}
              />
            )}
            <ChangesDialog
              open={dialog === "changes"}
              onOpenChange={(open) => {
                if (!open) setDialog(null);
              }}
              project={project}
              onReset={() => edit(project.original)}
            />
          </>
        )}
        <Dialog
          open={pending !== null}
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Keep your current changes?</DialogTitle>
              <DialogDescription>
                Opening another theme replaces the current local draft. Download
                your current source first, or discard it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (pending) activate(pending);
                  setPending(null);
                }}
              >
                Discard & open
              </Button>
              <Button
                onClick={() => {
                  if (project) downloadTheme(project.text, project.fileName);
                  if (pending) activate(pending);
                  setPending(null);
                }}
              >
                Download & open
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
