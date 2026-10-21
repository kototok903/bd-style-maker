import { RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InspectionHint } from "@/features/preview/components/InspectionHint";
import { InspectorPanel } from "@/features/preview/components/InspectorPanel";
import {
  fixtureDocument,
  loadFixture,
} from "@/features/preview/fixture/document";
import type {
  CompiledTheme,
  StylesheetCache,
} from "@/features/preview/lib/compile-theme";
import {
  compileTheme,
  groupFailedStylesheets,
} from "@/features/preview/lib/compile-theme";
import type { InspectorSelection } from "@/features/preview/lib/inspector-types";
import { readInspectorSelection } from "@/features/preview/lib/inspector-types";
import type { ThemeAnalysis } from "@/features/theme/theme-types";
import { cn } from "@/lib/utils";

type Props = {
  analysis: ThemeAnalysis;
  stale: boolean;
  light: boolean;
  inspect: boolean;
  onInspectEnd: () => void;
  fit: boolean;
  external: boolean;
  original?: string | null;
  onSelect: (selector: string) => void;
  onEnableResources: () => void;
};

export function ThemePreview({
  analysis,
  stale,
  light,
  inspect,
  onInspectEnd,
  fit,
  external,
  original,
  onSelect,
  onEnableResources,
}: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 800 });
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  const scale = fit ? Math.min(1, size.width / 1280) : 1;
  const channel = useRef<MessageChannel | null>(null);
  const revision = useRef(0);
  const cache = useRef<StylesheetCache>(new Map());
  const [ready, setReady] = useState(false),
    [matched, setMatched] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const [fixtureError, setFixtureError] = useState("");
  const [error, setError] = useState("");
  const [compiled, setCompiled] = useState<CompiledTheme>({
    css: "",
    resources: [],
  });
  const [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [samples, setSamples] = useState<unknown>(null);
  const [nativeStatus, setNativeStatus] = useState("loading");
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const inspectActive = useRef(inspect);
  useEffect(() => {
    inspectActive.current = inspect;
    if (!inspect) setSelection(null);
  }, [inspect]);
  const [token] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  useEffect(() => {
    let active = true;
    setFixtureError("");
    loadFixture()
      .then((html) => {
        if (active) setSnapshot(html);
      })
      .catch((e) => {
        if (active) setFixtureError(String(e));
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const document = useMemo(
    () => (snapshot ? fixtureDocument(token, external, snapshot) : ""),
    [token, external, snapshot],
  );
  const inspectEndCallback = useRef(onInspectEnd);
  useEffect(() => {
    inspectEndCallback.current = onInspectEnd;
  }, [onInspectEnd]);
  useEffect(() => {
    if (!inspect) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") onInspectEnd();
      if (
        event.altKey &&
        ["ArrowUp", "ArrowDown"].includes(event.key) &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            'input,textarea,[role="combobox"],[role="listbox"],[role="option"]',
          )
        )
      ) {
        event.preventDefault();
        channel.current?.port1.postMessage({
          type: event.key === "ArrowUp" ? "inspect-parent" : "inspect-child",
        });
      }
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [inspect, onInspectEnd]);
  const selectedCallback = useRef(onSelect);
  useEffect(() => {
    selectedCallback.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      compileTheme(
        original ?? analysis.source,
        external,
        controller.signal,
        cache.current,
      )
        .then((next) => {
          if (!controller.signal.aborted) {
            setCompiled(next);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(
              e instanceof Error ? e.message : "Cannot prepare the theme.",
            );
            setLoading(false);
          }
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [analysis.source, original, external, retry]);

  function connect() {
    channel.current?.port1.close();
    setReady(false);
    setMatched(null);
    setSelection(null);
    const connection = new MessageChannel();
    channel.current = connection;
    connection.port1.onmessage = (event) => {
      const message: unknown = event.data;
      if (!message || typeof message !== "object") return;
      const data = message as Record<string, unknown>;
      if (data.type === "ready") setReady(true);
      if (data.type === "inspect-cancelled") inspectEndCallback.current();
      if (data.type === "inspection" && inspectActive.current) {
        const next = readInspectorSelection(data.selection);
        if (next) setSelection(next);
      }
      if (
        data.type === "resources" &&
        data.revision === revision.current &&
        (data.status === "loaded" || data.status === "failed")
      ) {
        setNativeStatus(data.status);
      }
      if (
        data.type === "applied" &&
        data.revision === revision.current &&
        Array.isArray(data.matches)
      ) {
        setMatched(data.matches.length);
        setSamples(data.samples ?? null);
      }
    };
    connection.port1.start();
    frame.current?.contentWindow?.postMessage({ type: "bd-init", token }, "*", [
      connection.port2,
    ]);
  }
  useEffect(() => {
    if (!ready) return;
    revision.current += 1;
    setNativeStatus("loading");
    channel.current?.port1.postMessage({
      type: "update",
      css: compiled.css,
      revision: revision.current,
      native: compiled.native,
      light,
      inspect,
      rules: analysis.rules.map((r) => ({ id: r.id, selector: r.selector })),
    });
  }, [compiled, analysis.rules, light, inspect, ready]);
  useEffect(() => () => channel.current?.port1.close(), []);
  const failed = groupFailedStylesheets(compiled.resources),
    paused = compiled.resources.filter((r) => r.status === "paused"),
    loaded = compiled.resources.filter((r) => r.status === "loaded").length;
  return (
    <section
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        inspect &&
          "after:pointer-events-none after:absolute after:inset-0 after:border-[0.5px] after:border-ring",
      )}
      aria-label="Live theme preview"
      aria-busy={!ready || loading}
      data-matched-selectors={matched ?? undefined}
      data-preview-diagnostics={JSON.stringify(samples)}
      data-stylesheets-loaded={loaded}
      data-native-styles-status={compiled.native ? nativeStatus : undefined}
    >
      {inspect && selection && (
        <InspectorPanel
          selection={selection}
          onNavigate={(id) =>
            channel.current?.port1.postMessage({ type: "inspect-target", id })
          }
          onVariant={(id) =>
            channel.current?.port1.postMessage({ type: "inspect-variant", id })
          }
          onUse={(selector) => {
            selectedCallback.current(selector);
            inspectEndCallback.current();
            setSelection(null);
          }}
          onCancel={() => inspectEndCallback.current()}
        />
      )}
      {(fixtureError ||
        error ||
        (failed.length > 0 &&
          (!compiled.native || nativeStatus === "failed"))) && (
        <Alert
          className="max-h-[150px] shrink-0 overflow-y-auto rounded-none border-x-0 border-t-0"
          variant="destructive"
        >
          <AlertTitle>
            {fixtureError ||
              error ||
              (compiled.native
                ? "Some imported styles could not load"
                : `${failed.length} stylesheet${failed.length === 1 ? "" : "s"} could not load`)}
          </AlertTitle>
          <AlertDescription>
            {compiled.native && (
              <p>
                Check that this theme’s import URLs are still available. The
                preview may be incomplete.
              </p>
            )}
            {failed.length > 0 && (
              <details>
                <summary className="cursor-pointer">
                  {failed.length} source{failed.length === 1 ? "" : "s"}{" "}
                  unavailable for inspection
                </summary>
                <div className="mt-2 flex flex-col gap-3">
                  {failed.map((resource) => (
                    <div key={resource.url} className="flex flex-col gap-1">
                      <div className="break-all">
                        {resource.url}: {resource.messages.join("; ")}
                      </div>
                      <div>Imported by:</div>
                      <ul className="list-disc pl-5">
                        {resource.importedFrom.map((origin) => (
                          <li
                            key={JSON.stringify(origin)}
                            className="break-all"
                          >
                            {origin.url ?? "Current theme"} · line {origin.line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                cache.current.clear();
                setRetry(retry + 1);
              }}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Retry preview
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {paused.length > 0 && (
        <Alert className="max-h-[150px] shrink-0 overflow-y-auto rounded-none border-x-0 border-t-0">
          <AlertTitle>This theme needs its imported styles</AlertTitle>
          <AlertDescription>
            <span>
              {paused.length} import{paused.length === 1 ? " is" : "s are"}{" "}
              paused. The preview cannot show the complete theme.
            </span>
            <Button size="sm" onClick={onEnableResources}>
              Load theme styles
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-preview-checker bg-[conic-gradient(var(--preview-checker-alt)_25%,transparent_0_50%,var(--preview-checker-alt)_0_75%,transparent_0)] bg-size-[24px_24px]"
        ref={canvas}
        style={{ overflow: fit ? "hidden" : "auto" }}
      >
        {inspect && !selection && <InspectionHint />}
        {document && (
          <iframe
            className="absolute block size-full origin-top-left border-0 scheme-normal"
            style={{
              width: Math.max(1280, size.width),
              height: Math.max(400, size.height / Math.max(scale, 0.1)),
              transform: `scale(${scale})`,
            }}
            ref={frame}
            srcDoc={document}
            sandbox="allow-scripts"
            title="Discord theme preview"
            onLoad={connect}
          />
        )}{" "}
        {(!ready || loading) && (
          <div className="absolute inset-0 grid place-items-center bg-card text-[12px] text-muted-foreground">
            {ready
              ? "Loading imported stylesheets…"
              : "Preparing Discord preview…"}
          </div>
        )}
      </div>
      {stale && !inspect && (
        <Badge
          variant="outline"
          className="pointer-events-none absolute top-2 left-2"
        >
          Last valid CSS
        </Badge>
      )}
    </section>
  );
}
