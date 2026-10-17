import {
  CrosshairIcon,
  MoonIcon,
  RefreshCwIcon,
  SunIcon,
  UnplugIcon,
} from "lucide-react";
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
  external: boolean;
  original?: string | null;
  onSelect: (selector: string) => void;
  onEnableResources: () => void;
};

export function ThemePreview({
  analysis,
  stale,
  external,
  original,
  onSelect,
  onEnableResources,
}: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 800 });
  const [fit, setFit] = useState(true);
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
  const [light, setLight] = useState(false),
    [inspect, setInspect] = useState(false);
  const [ready, setReady] = useState(false),
    [matched, setMatched] = useState<number | null>(null);
  const [selection, setSelection] = useState("");
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
        setSelection(data.name);
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
      className="preview-pane"
      aria-label="Live theme preview"
      data-preview-diagnostics={JSON.stringify(samples)}
      data-stylesheets-loaded={loaded}
      data-native-styles-status={compiled.native ? nativeStatus : undefined}
    >
      <header className="preview-toolbar">
        <div className="preview-heading">
          <span className="live-indicator" />
          <span>{loading ? "Loading theme styles…" : "Live preview"}</span>
          {original !== null && original !== undefined && (
            <Badge variant="secondary">Original</Badge>
          )}
          {stale && <Badge variant="outline">Last valid CSS</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={inspect ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Inspect preview element"
            aria-pressed={inspect}
            onClick={() => setInspect(!inspect)}
          >
            <CrosshairIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Toggle preview appearance"
            onClick={() => setLight(!light)}
          >
            {light ? (
              <SunIcon data-icon="inline-start" />
            ) : (
              <MoonIcon data-icon="inline-start" />
            )}
            {light ? "Light" : "Dark"}
          </Button>
        </div>
      </header>
      {(fixtureError || error || failed.length > 0) && (
        <Alert
          variant={
            fixtureError ||
            error ||
            !compiled.native ||
            nativeStatus === "failed"
              ? "destructive"
              : "default"
          }
        >
          <AlertTitle>
            {fixtureError ||
              error ||
              (compiled.native
                ? nativeStatus === "loaded"
                  ? "Styles loaded through the browser"
                  : nativeStatus === "failed"
                    ? "Some imported styles could not load"
                    : "Loading styles through the browser…"
                : `${failed.length} stylesheets could not load`)}
          </AlertTitle>
          <AlertDescription>
            {compiled.native && (
              <p>
                {nativeStatus === "failed"
                  ? "Check that this theme’s import URLs are still available. The preview may be incomplete."
                  : "The browser is loading the original imports. Some remote sources cannot be inspected or counted."}
              </p>
            )}
            {failed.length > 0 && (
              <details
                open={
                  compiled.native && nativeStatus === "loaded"
                    ? false
                    : undefined
                }
              >
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
        <Alert>
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
        className="preview-frame"
        ref={canvas}
        style={{ overflow: fit ? "hidden" : "auto" }}
      >
        {document && (
          <iframe
            style={{
              width: Math.max(1280, size.width),
              height: Math.max(400, size.height / Math.max(scale, 0.1)),
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
            }}
            ref={frame}
            srcDoc={document}
            sandbox="allow-scripts"
            title="Discord theme preview"
            onLoad={connect}
          />
        )}{" "}
        {(!ready || loading) && (
          <div className="preview-loading">
            {ready
              ? "Loading imported stylesheets…"
              : "Preparing Discord preview…"}
          </div>
        )}
      </div>
      <footer className="preview-footer">
        <span>
          <button
            type="button"
            className="preview-scale"
            onClick={() => setFit(!fit)}
            aria-label="Toggle preview zoom"
          >
            {fit
              ? `Fit · ${Math.round(scale * 100)}%`
              : "100% · scroll to explore"}
          </button>
          {compiled.native
            ? `Discord DOM snapshot · browser imports ${nativeStatus}`
            : `Discord DOM snapshot · ${loaded} imported stylesheet${loaded === 1 ? "" : "s"} loaded`}
        </span>
        <span>
          {matched === null
            ? "Connecting…"
            : `${matched} of ${analysis.rules.length} local selectors match`}
        </span>
      </footer>
      <div className="preview-notes">
        <span>
          <UnplugIcon />
          {external ? "Theme resources enabled" : "External resources paused"}
        </span>
        <span>
          {inspect
            ? selection
              ? `Selected: ${selection}`
              : "Select an element to edit its styles"
            : "Captured Discord markup; some client states are unavailable."}
        </span>
      </div>
    </section>
  );
}
