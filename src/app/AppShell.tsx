import {
  Code2Icon,
  CrosshairIcon,
  DownloadIcon,
  FileCode2Icon,
  FilePenLineIcon,
  FileTextIcon,
  FolderOpenIcon,
  GitCompareArrowsIcon,
  LinkIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  Redo2Icon,
  ScanIcon,
  SlidersHorizontalIcon,
  SunIcon,
  Undo2Icon,
  XIcon,
  ZoomInIcon,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DependenciesDialog } from "@/features/dependencies/components/DependenciesDialog";
import { previewCss } from "@/features/dependencies/lib/dependencies";
import { OpenTheme } from "@/features/editor/components/OpenTheme";
import type { PreviewInspection } from "@/features/editor/components/VisualEditor";
import { VisualEditor } from "@/features/editor/components/VisualEditor";
import {
  ChangesDialog,
  ExportDialog,
  MetadataDialog,
  PasteDialog,
} from "@/features/editor/components/WorkspaceDialogs";
import { useEditorScroll } from "@/features/editor/hooks/useEditorScroll";
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

type PendingNavigation =
  { kind: "open"; project: ThemeProject } | { kind: "home" };

const emptyAnalysis = analyzeTheme("");
const SourceEditor = lazy(() =>
  import("@/features/editor/components/SourceEditor").then((module) => ({
    default: module.SourceEditor,
  })),
);

export function AppShell() {
  const { state, dispatch, hydrated, storageError, dirty } = useThemeSession();
  const project = state.project;
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState("visual");
  const { ref: editorScrollRef, saveScroll } = useEditorScroll(
    mode,
    project?.id,
  );
  function changeMode(next: string) {
    saveScroll();
    setMode(next);
  }
  const [selectedRule, setSelectedRule] = useState("");
  const [inspection, setInspection] = useState<PreviewInspection | null>(null);
  const [jump, setJump] = useState<{ offset: number; nonce: number } | null>(
    null,
  );
  const [dialog, setDialog] = useState<
    "metadata" | "imports" | "export" | "paste" | "changes" | null
  >(null);
  const [external, setExternal] = useState(true);
  const [base, setBase] = useState("");
  const [compare, setCompare] = useState(false);
  const [previewLight, setPreviewLight] = useState(false);
  const [previewInspect, setPreviewInspect] = useState(false);
  const [previewFit, setPreviewFit] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingNavigation | null>(null);
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
    changeMode("css");
    setCollapsed(false);
    setJump({ offset, nonce: Date.now() });
  };

  function activate(next: ThemeProject | null) {
    dispatch({ type: "open", project: next });
    changeMode(next && analyzeTheme(next.text).diagnostic ? "css" : "visual");
    setSelectedRule("");
    setInspection(null);
    setJump(null);
    setLastValid(emptyAnalysis);
    setBase("");
    setExternal(true);
    setCompare(false);
    setCollapsed(false);
    setError("");
    setMessage(next ? `Opened ${next.fileName}.` : "Theme closed.");
    setDialog(null);
    setPending(null);
    setPreviewInspect(false);
  }
  function requestOpen(text: string, fileName: string) {
    const next = createProject(text, fileName);
    if (dirty) setPending({ kind: "open", project: next });
    else activate(next);
  }
  function requestHome() {
    if (!project) return;
    if (dirty || state.past.length || state.future.length)
      setPending({ kind: "home" });
    else activate(null);
  }
  function finishNavigation() {
    if (pending) activate(pending.kind === "open" ? pending.project : null);
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
    setPreviewInspect(false);
    changeMode("visual");
    setCollapsed(false);
    setInspection({ selector, create: !matching, nonce: Date.now() });
    if (matching) setSelectedRule(matching.id);
  }
  function tool(
    label: string,
    icon: React.ReactNode,
    action: () => void,
    disabled = false,
    pressed?: boolean,
    hint = label,
  ) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={pressed ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={label}
              aria-pressed={pressed}
              onClick={action}
              disabled={disabled}
            />
          }
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    );
  }
  const ruleId =
    analysis.rules.find((r) => r.id === selectedRule)?.id ?? "all-variables";

  return (
    <TooltipProvider>
      <div
        className="flex h-dvh flex-col overflow-hidden bg-background"
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
        <header className="flex h-12 shrink-0 items-center gap-5 border-b px-4 max-[760px]:gap-3 max-[400px]:gap-2 max-[400px]:px-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-1 h-auto gap-[11px] p-1 max-[400px]:gap-2"
            aria-label="Back to themes"
            disabled={!hydrated}
            onClick={requestHome}
          >
            <img
              src="/favicon.svg"
              alt=""
              className="size-7 shrink-0 rounded-lg"
            />
            <strong className="text-[14px] font-semibold tracking-[-0.35px] max-[400px]:text-[12px]">
              BD S<span className="text-muted-foreground">tyle</span> M
              <span className="text-muted-foreground">aker</span>
            </strong>
          </Button>
          {project && (
            <div className="flex min-w-0 items-center gap-[9px] border-l pl-4 text-[12px] text-muted-foreground max-[760px]:hidden">
              <FileCode2Icon className="size-[15px] shrink-0" />
              <span className="truncate">{project.fileName}</span>
              {dirty && (
                <span
                  className="size-[5px] shrink-0 rounded-full bg-ring"
                  title="Changes not exported"
                />
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-[7px] max-[400px]:gap-1">
            {project && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="New theme"
                  onClick={() => requestOpen(emptyTheme, "Untitled.theme.css")}
                >
                  <PlusIcon data-icon="inline-start" />
                  <span className="max-[760px]:hidden">New theme</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Open theme"
                  onClick={() => input.current?.click()}
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  <span className="max-[760px]:hidden">Open theme</span>
                </Button>
                <Button size="sm" onClick={requestExport}>
                  <DownloadIcon data-icon="inline-start" />
                  <span>Export</span>
                </Button>
              </>
            )}
          </div>
        </header>
        {error && (
          <Alert
            variant="destructive"
            className="shrink-0 rounded-none border-x-0 border-t-0"
          >
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
        {storageError && (
          <Alert
            variant="destructive"
            className="shrink-0 rounded-none border-x-0 border-t-0"
          >
            <AlertDescription>{storageError}</AlertDescription>
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
            <div
              className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b px-3 py-1"
              role="toolbar"
              aria-label="Theme workspace"
            >
              <div className="flex items-center gap-[3px]">
                {tool(
                  collapsed ? "Show editor" : "Hide editor",
                  collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />,
                  () => setCollapsed(!collapsed),
                )}
                <Separator orientation="vertical" className="mx-2 my-1" />
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
                <span className="mx-2.5 h-4 w-px bg-border max-[760px]:mx-[5px]" />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Theme info"
                  onClick={() => setDialog("metadata")}
                >
                  <FileTextIcon data-icon="inline-start" />
                  <span className="max-[760px]:hidden">Theme info</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Imports"
                  onClick={() => setDialog("imports")}
                >
                  <LinkIcon data-icon="inline-start" />
                  <span className="max-[760px]:hidden">Imports</span>
                  {analysis.imports.length > 0 && (
                    <Badge variant="secondary">{analysis.imports.length}</Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Changes"
                  onClick={() => setDialog("changes")}
                >
                  <FilePenLineIcon data-icon="inline-start" />
                  <span className="max-[760px]:hidden">Changes</span>
                </Button>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {tool(
                  "Inspect preview element",
                  <CrosshairIcon />,
                  () => setPreviewInspect(!previewInspect),
                  false,
                  previewInspect,
                  "Inspect: click a preview component, choose its part or state, then use its selector. Esc cancels.",
                )}
                {tool(
                  previewFit ? "Preview at 100%" : "Fit preview to pane",
                  previewFit ? <ZoomInIcon /> : <ScanIcon />,
                  () => setPreviewFit(!previewFit),
                  false,
                  !previewFit,
                )}
                {tool(
                  previewLight ? "Use dark preview" : "Use light preview",
                  previewLight ? <SunIcon /> : <MoonIcon />,
                  () => setPreviewLight(!previewLight),
                )}
                <Button
                  variant={compare ? "secondary" : "ghost"}
                  size="sm"
                  aria-label={
                    compare ? "View edited theme" : "Compare original"
                  }
                  aria-pressed={compare}
                  onClick={() => setCompare(!compare)}
                >
                  <GitCompareArrowsIcon data-icon="inline-start" />
                  <span className="max-[760px]:hidden">
                    {compare ? "Viewing original" : "Compare original"}
                  </span>
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 max-[760px]:overflow-auto">
              {/* Panel className styles its inner scroll container, so the group targets outer panels. */}
              <ResizablePanelGroup
                orientation="horizontal"
                className={cn(
                  "min-h-0 max-[760px]:h-auto! max-[760px]:flex-col! max-[760px]:overflow-visible! max-[760px]:[&>[data-slot=resizable-handle]]:hidden!",
                  "max-[760px]:[&>[data-slot=resizable-panel]]:w-full! max-[760px]:[&>[data-slot=resizable-panel]]:max-w-none! max-[760px]:[&>[data-slot=resizable-panel]]:min-w-0!",
                  "max-[760px]:[&>[data-slot=resizable-panel]:first-child]:min-h-[510px]! max-[760px]:[&>[data-slot=resizable-panel]:first-child]:flex-[0_0_510px]!",
                  "max-[760px]:[&>[data-slot=resizable-panel]:last-child]:min-h-[620px] max-[760px]:[&>[data-slot=resizable-panel]:last-child]:flex-[0_0_620px]!",
                  collapsed &&
                    "[&>[data-slot=resizable-handle]]:hidden! [&>[data-slot=resizable-panel]:first-child]:hidden! max-[760px]:[&>[data-slot=resizable-panel]:last-child]:basis-[720px]!",
                )}
              >
                <ResizablePanel
                  id="editor"
                  defaultSize="31%"
                  minSize="310px"
                  maxSize="65%"
                  className="min-w-0"
                >
                  <Tabs
                    value={mode}
                    onValueChange={changeMode}
                    ref={editorScrollRef}
                    className="h-full gap-0"
                  >
                    <div className="px-[22px] pt-[18px] pb-1.5 max-[1050px]:px-[17px] max-[1050px]:pt-4 max-[1050px]:pb-[5px] max-[760px]:px-[22px] min-[1600px]:px-7 min-[1600px]:pt-[22px]">
                      <TabsList className="w-full">
                        <TabsTrigger value="visual">
                          <SlidersHorizontalIcon />
                          Visual editor
                        </TabsTrigger>
                        <TabsTrigger value="css">
                          <Code2Icon />
                          CSS editor
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent
                      value="visual"
                      keepMounted
                      className="min-h-0 overflow-hidden"
                    >
                      <ScrollArea className="h-full">
                        <VisualEditor
                          key={project.id}
                          inspection={inspection}
                          onInspectionHandled={() => setInspection(null)}
                          analysis={analysis}
                          original={original}
                          selectedRule={ruleId}
                          onSelectRule={setSelectedRule}
                          onEdit={edit}
                          onJump={jumpTo}
                          onInspect={() => setPreviewInspect(true)}
                        />
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent
                      value="css"
                      keepMounted
                      className="flex h-full min-h-0 flex-col overflow-hidden pt-[15px]"
                    >
                      <div className="flex items-center justify-between gap-2.5 px-[21px] pb-3 font-mono text-[10px] text-muted-foreground">
                        <span className="truncate">
                          <span className="mr-[7px] inline-block size-[5px] rounded-full bg-ring" />
                          {project.fileName}
                        </span>
                        <span>CSS</span>
                      </div>
                      <Suspense
                        fallback={
                          <div className="min-h-0 flex-1 overflow-hidden border-y p-5 text-sm text-muted-foreground">
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
                        <div
                          className="bg-editor-surface px-[18px] py-2.5 text-[11px] leading-[1.7] text-destructive"
                          role="alert"
                        >
                          Line {analysis.diagnostic.line}:
                          {analysis.diagnostic.column} ·{" "}
                          {analysis.diagnostic.message}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel id="preview" minSize="35%">
                  <ThemePreview
                    analysis={previewAnalysis}
                    light={previewLight}
                    inspect={previewInspect}
                    onInspectEnd={() => setPreviewInspect(false)}
                    fit={previewFit}
                    stale={!!analysis.diagnostic && !compare}
                    external={external}
                    onEnableResources={() => setExternal(true)}
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
        <span className="sr-only" role="status" aria-live="polite">
          {message}
        </span>
        {dragging && (
          <div className="pointer-events-none fixed inset-3 z-100 flex flex-col items-center justify-center gap-[15px] rounded-[14px] border-2 border-dashed border-ring bg-background/95">
            <FolderOpenIcon className="size-10 text-ring" />
            <strong className="text-[23px] font-medium">
              Drop to open your theme
            </strong>
            <span className="text-muted-foreground">
              .theme.css or .css · up to 2 MB
            </span>
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
                {pending?.kind === "home"
                  ? "Closing this theme clears its local draft and undo/redo history. Download your current source first, or discard it."
                  : "Opening another theme replaces the current local draft. Download your current source first, or discard it."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={finishNavigation}>
                {pending?.kind === "home"
                  ? "Discard & close"
                  : "Discard & open"}
              </Button>
              <Button
                onClick={() => {
                  if (project) downloadTheme(project.text, project.fileName);
                  finishNavigation();
                }}
              >
                {pending?.kind === "home"
                  ? "Download & close"
                  : "Download & open"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
