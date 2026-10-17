import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DependencyResult } from "@/features/dependencies/lib/dependencies";
import {
  inspectDependencies,
  resolveResource,
} from "@/features/dependencies/lib/dependencies";
import type { ThemeImport } from "@/features/theme/theme-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imports: ThemeImport[];
  external: boolean;
  onExternalChange: (value: boolean) => void;
  base: string;
  onBaseChange: (value: string) => void;
};

export function DependenciesDialog({
  open,
  onOpenChange,
  imports,
  external,
  onExternalChange,
  base,
  onBaseChange,
}: Props) {
  const [results, setResults] = useState<DependencyResult[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [viewing, setViewing] = useState<DependencyResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    controller.current?.abort();
    setResults(null);
    setScanning(false);
  }, [imports, base]);
  useEffect(() => {
    if (!open) {
      controller.current?.abort();
      setScanning(false);
    }
  }, [open]);
  useEffect(() => () => controller.current?.abort(), []);
  async function scan() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setScanning(true);
    const next = await inspectDependencies(imports, base, active.signal);
    if (!active.signal.aborted) {
      setResults(next);
      setScanning(false);
    }
  }
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Imports & resources</DialogTitle>
            <DialogDescription>
              Original import order and URLs are preserved when you export.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="external-resources">
                  Load external resources
                </FieldLabel>
                <FieldDescription>
                  Allow HTTPS stylesheets, images, and fonts inside the preview.
                </FieldDescription>
              </div>
              <Switch
                id="external-resources"
                checked={external}
                onCheckedChange={onExternalChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="base-url">
                Theme source URL (optional)
              </FieldLabel>
              <Input
                id="base-url"
                placeholder="https://example.com/themes/MyTheme.theme.css"
                value={base}
                onChange={(e) => onBaseChange(e.target.value)}
                aria-invalid={!!base && !resolveResource(base)}
              />
              <FieldDescription>
                Used only for preview and dependency lookup when your file has
                relative URLs. HTTPS only.
              </FieldDescription>
            </Field>
          </FieldGroup>
          {!imports.length ? (
            <Alert>
              <AlertDescription>
                No active @import rules in this file. Images and fonts may still
                reference external URLs.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {imports.length} direct import
                  {imports.length === 1 ? "" : "s"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scan}
                  disabled={scanning}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  {scanning ? "Reading sources…" : "Inspect sources"}
                </Button>
              </div>
              {results
                ? results.map((item, index) => (
                    <div
                      key={index}
                      className="dependency-row"
                      style={{ marginLeft: Math.min(item.depth * 12, 48) }}
                    >
                      <code>{item.url}</code>
                      <p>{item.status}</p>
                      {item.source !== undefined && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {item.variableCount} variables
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewing(item)}
                          >
                            Read source{" "}
                            <ExternalLinkIcon data-icon="inline-end" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                : imports.map((item) => (
                    <div className="dependency-row" key={item.id}>
                      <code>{item.url}</code>
                      <p>
                        {item.conditions || "All media"} · Line {item.line}
                      </p>
                      <Badge variant="outline">
                        {external
                          ? "Enabled in preview · not verified"
                          : "Paused in preview"}
                      </Badge>
                    </div>
                  ))}
            </>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            A cross-origin stylesheet can render while its source remains
            unreadable. Source inspection makes network requests from your
            browser. Remote files are read-only in v1; edit local overrides in
            your theme.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={viewing !== null}
        onOpenChange={(next) => {
          if (!next) setViewing(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dependency source</DialogTitle>
            <DialogDescription className="break-all">
              {viewing?.url} · read-only
            </DialogDescription>
          </DialogHeader>
          <pre className="dependency-source">{viewing?.source}</pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
