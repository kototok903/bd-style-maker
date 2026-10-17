// Rebuild from sanitized DOM and public, versioned Discord assets.
// Updating the capture is an explicit browser-inspection task. This generator
// does not read account APIs, tokens, cookies, or private messages.
import { createHash } from "node:crypto";

import postcss from "postcss";
import valueParser from "postcss-value-parser";

const directory = "src/features/preview/fixture";
const manifest = await Bun.file("scripts/discord-css-manifest.json").json();
const artwork = `data:image/svg+xml;base64,${Buffer.from(await Bun.file("public/preview-artwork.svg").text()).toString("base64")}`;
const body = (
  await Bun.file(`${directory}/discord-body.html`).text()
).replaceAll("/preview-artwork.svg", artwork);
const sources = new Array<string>(manifest.styles.length);
const hashes = new Array<string>(manifest.styles.length);
const masks = new Set<string>();
const fonts = new Set<string>();
let next = 0;
await Promise.all(
  Array.from({ length: 16 }, async () => {
    while (next < manifest.styles.length) {
      const index = next++;
      const { url, media, disabled } = manifest.styles[index];
      if (disabled) {
        sources[index] = "";
        hashes[index] = "disabled";
        continue;
      }
      if (!/^https:\/\/discord\.com\/assets\/[\w.-]+\.css$/.test(url))
        throw new Error(`Unexpected asset URL: ${url}`);
      const cached = Bun.file(
        `node_modules/.cache/discord-fixture/${new URL(url).pathname.split("/").pop()}`,
      );
      let source: string;
      if (await cached.exists()) source = await cached.text();
      else {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok)
          throw new Error(`Cannot fetch ${url}: ${response.status}`);
        source = await response.text();
        await Bun.write(cached, source);
      }
      hashes[index] = createHash("sha256").update(source).digest("hex");
      const root = postcss.parse(source, { from: url });
      root.walkAtRules("charset", (rule) => rule.remove());
      root.walkDecls((decl) => {
        if (!/url\(/i.test(decl.value)) return;
        const value = valueParser(decl.value);
        value.walk((node) => {
          if (node.type !== "function" || node.value.toLowerCase() !== "url")
            return;
          const path = valueParser
            .stringify(node.nodes)
            .replace(/^(['"])(.*)\1$/, "$2");
          if (!path || path.startsWith("data:") || path.startsWith("#")) return;
          const absolute = new URL(path, url).href;
          if (
            decl.prop.includes("mask") &&
            /^https:\/\/discord\.com\/assets\/[\w.-]+\.(svg|png|webp)$/.test(
              absolute,
            )
          )
            masks.add(absolute);
          if (
            decl.parent?.type === "atrule" &&
            decl.parent.name === "font-face" &&
            /^https:\/\/discord\.com\/assets\/[\w.-]+\.(woff2?|ttf|otf)$/.test(
              absolute,
            )
          )
            fonts.add(absolute);
          node.nodes = [
            {
              type: "string",
              quote: '"',
              value: absolute,
              sourceIndex: 0,
              sourceEndIndex: absolute.length,
            },
          ];
        });
        decl.value = value.toString();
      });
      const css = root.toString();
      sources[index] = media ? `@media ${media}{${css}}` : css;
    }
  }),
);
// CSS masks require CORS, unlike ordinary background images. Discord serves
// these assets for its own origin; bundle them as data URLs for our opaque frame.
const bundledAssets = await Promise.all(
  [...masks, ...fonts].map(async (url) => {
    const file = Bun.file(
      `node_modules/.cache/discord-fixture/${new URL(url).pathname.split("/").pop()}`,
    );
    let bytes: Uint8Array;
    if (await file.exists()) bytes = new Uint8Array(await file.arrayBuffer());
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok)
        throw new Error(`Cannot fetch asset ${url}: ${response.status}`);
      bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 1024 * 1024)
        throw new Error(`Asset exceeds 1 MB: ${url}`);
      await Bun.write(file, bytes);
    }
    return {
      url,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      data: `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`,
    };
  }),
);
let css = sources.join("\n");
for (const asset of bundledAssets)
  css = css.replaceAll(`url("${asset.url}")`, `url("${asset.data}")`);
const attrs = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
const snapshot = `<!doctype html><html lang="en" class="${attrs(manifest.htmlClass)}" style="${attrs(manifest.htmlStyle || "")}"><head><!--BD_HEAD--><style data-discord-base>${css.replace(/<\/style/gi, "<\\/style")}</style><style id="theme-source"></style></head><body style="${attrs(manifest.bodyStyle || "")}">${body}<!--BD_SCRIPT--></body></html>`;
await Bun.write(`${directory}/discord-snapshot.html`, snapshot);
await Bun.write(
  `${directory}/capture.json`,
  JSON.stringify(
    {
      capturedAt: manifest.capturedAt,
      viewport: manifest.viewport,
      metrics: manifest.metrics,
      maskAssets: bundledAssets
        .filter((a) => masks.has(a.url))
        .map(({ url, sha256 }) => ({ url, sha256 })),
      fontAssets: bundledAssets
        .filter((a) => fonts.has(a.url))
        .map(({ url, sha256 }) => ({ url, sha256 })),
      stylesheets: manifest.styles.map((s: { url: string }, i: number) => ({
        url: s.url,
        sha256: hashes[i],
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Generated current Discord fixture: ${manifest.styles.length} stylesheets, ${(snapshot.length / 1024 / 1024).toFixed(2)} MB.`,
);
