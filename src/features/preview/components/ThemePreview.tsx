import { CrosshairIcon, MoonIcon, SunIcon, UnplugIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fixtureDocument } from "@/features/preview/fixture/document";
import type { ThemeAnalysis } from "@/features/theme/theme-types";

type Props = {
  analysis: ThemeAnalysis;
  stale: boolean;
  external: boolean;
  original?: string | null;
  onSelect: (selector: string) => void;
};

export function ThemePreview({
  analysis,
  stale,
  external,
  original,
  onSelect,
}: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const channel = useRef<MessageChannel | null>(null);
  const revision = useRef(0);
  const [light, setLight] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [scene, setScene] = useState("chat");
  const [ready, setReady] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [selection, setSelection] = useState("");
  const [token] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const document = useMemo(
    () => fixtureDocument(token, external),
    [token, external],
  );
  const selectedCallback = useRef(onSelect);
  useEffect(() => {
    selectedCallback.current = onSelect;
  }, [onSelect]);

  const connect = () => {
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
        data.type === "applied" &&
        data.revision === revision.current &&
        Array.isArray(data.matches)
      )
        setMatched(data.matches.length);
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
  };

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => {
      revision.current += 1;
      channel.current?.port1.postMessage({
        type: "update",
        css: original ?? analysis.source,
        revision: revision.current,
        light,
        inspect,
        scene,
        rules: analysis.rules.map((r) => ({ id: r.id, selector: r.selector })),
      });
    }, 100);
    return () => clearTimeout(timeout);
  }, [analysis, light, inspect, scene, ready, original]);
  useEffect(() => () => channel.current?.port1.close(), []);

  return (
    <section className="preview-pane" aria-label="Live theme preview">
      <header className="preview-toolbar">
        <div className="preview-heading">
          <span className="live-indicator" /> <span>Live preview</span>
          {original !== null && original !== undefined && (
            <Badge variant="secondary">Original</Badge>
          )}
          {stale && <Badge variant="outline">Last valid CSS</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={[scene]}
            onValueChange={(values) => {
              if (values[0]) setScene(values[0]);
            }}
            aria-label="Preview scene"
            size="sm"
          >
            <ToggleGroupItem value="chat">Chat</ToggleGroupItem>
            <ToggleGroupItem value="settings">Settings</ToggleGroupItem>
          </ToggleGroup>
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
      <div className="preview-frame">
        <iframe
          ref={frame}
          srcDoc={document}
          sandbox="allow-scripts"
          title="Discord theme preview"
          onLoad={connect}
        />
        {!ready && (
          <div className="preview-loading">Preparing your preview…</div>
        )}
      </div>
      <footer className="preview-footer">
        <span>Approximate Discord fixture · v1</span>
        <span>
          {matched === null
            ? "Connecting…"
            : `${matched} of ${analysis.rules.length} selectors match this scene`}
        </span>
      </footer>
      <div className="preview-notes">
        <span>
          <UnplugIcon />
          {external
            ? "External styles, fonts, and images enabled"
            : "External resources paused"}
        </span>
        {inspect ? (
          <span>
            {selection
              ? `Selected: ${selection}`
              : "Select an element to open its guided controls"}
          </span>
        ) : (
          <span>Theme styles stay inside this preview.</span>
        )}
      </div>
    </section>
  );
}
