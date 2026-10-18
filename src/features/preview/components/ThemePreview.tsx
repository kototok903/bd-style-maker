import { RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fixtureDocument,
  loadFixture,
} from "@/features/preview/fixture/document";
import type {
  CompiledTheme,
  StylesheetCache,
} from "@/features/preview/lib/compile-theme";
import { compileTheme } from "@/features/preview/lib/compile-theme";
import type { ThemeAnalysis } from "@/features/theme/theme-types";

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
    const connection = new MessageChannel();
    channel.current = connection;
    connection.port1.onmessage = (event) => {
      const message: unknown = event.data;
      if (!message || typeof message !== "object") return;
      const data = message as Record<string, unknown>;
      if (data.type === "ready") setReady(true);
      if (data.type === "inspect-cancelled") inspectEndCallback.current();
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
      if (
        data.type === "selected" &&
        typeof data.selector === "string" &&
        typeof data.name === "string"
      ) {
        selectedCallback.current(data.selector);
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
  const failed = compiled.resources.filter((r) => r.status === "failed"),
    paused = compiled.resources.filter((r) => r.status === "paused"),
    loaded = compiled.resources.filter((r) => r.status === "loaded").length;
  return (
    <section
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      aria-label="Live theme preview"
      aria-busy={!ready || loading}
      data-matched-selectors={matched ?? undefined}
      data-preview-diagnostics={JSON.stringify(samples)}
      data-stylesheets-loaded={loaded}
      data-native-styles-status={compiled.native ? nativeStatus : undefined}
    >
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
                : `${failed.length} stylesheets could not load`)}
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
                  {failed.length} sources unavailable for inspection
                </summary>
                {failed.map((r) => (
                  <p key={r.url} className="break-all">
                    {r.url}: {r.message}
                  </p>
                ))}
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
      {inspect && (
        <div
          className="absolute top-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-3 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
          role="status"
        >
          Click an outlined area to edit its CSS.
          <Button size="xs" variant="ghost" onClick={onInspectEnd}>
            Cancel (Esc)
          </Button>
        </div>
      )}
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
