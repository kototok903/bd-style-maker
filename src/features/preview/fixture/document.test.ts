import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { fixtureDocument } from "@/features/preview/fixture/document";

const snapshot = readFileSync(
  "src/features/preview/fixture/discord-snapshot.html",
  "utf8",
);

describe("bundled Discord preview", () => {
  it("preserves the current client's grid, structural attributes and message nesting", () => {
    const document = new DOMParser().parseFromString(
      snapshot.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""),
      "text/html",
    );
    expect(
      document.querySelector(".base__5e434 .sidebar__5e434 .guilds__5e434"),
    ).not.toBeNull();
    expect(document.querySelector(".sidebarList__5e434")).not.toBeNull();
    expect(
      document.querySelector(".message__5126c .embedFull__623de"),
    ).not.toBeNull();
    expect(document.querySelector(".channelTextArea_f75fb0")).not.toBeNull();
    expect(
      document.querySelector('.chat_f75fb0[data-has-border="true"]'),
    ).not.toBeNull();
    expect(
      document.querySelector(
        '.channelTextArea_f75fb0 [contenteditable="true"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelector(".container_c8ffbb > .membersWrap_c8ffbb"),
    ).not.toBeNull();
    expect(document.querySelector(".guilds_c48ade")).toBeNull();
    expect(document.querySelector('[data-element="Message"]')).not.toBeNull();
    expect(snapshot).toContain("<style data-discord-base>");
    expect(snapshot.includes("--background-base-low:")).toBe(true);
    expect(document.querySelector("script,link,meta,iframe")).toBeNull();
    for (const element of document.querySelectorAll("*")) {
      expect(
        element.getAttributeNames().some((name) => /^on|^srcdoc$/i.test(name)),
      ).toBe(false);
    }
  });

  it("contains sample content without account identifiers or private resources", () => {
    const body = readFileSync(
      "src/features/preview/fixture/discord-body.html",
      "utf8",
    );
    expect([...new Set(body.match(/(?<![\d.])\d{15,22}(?![\d.])/g))]).toEqual([
      "100000000000000001",
    ]);
    expect(
      /\/channels\/|\/avatars\/\d{15}|\/attachments\/|data-safe-src|data-dnd-name/.test(
        body,
      ),
    ).toBe(false);
    expect(body).toContain("Midnight studio");
    expect(body).not.toContain('role="dialog"');
    expect(
      snapshot.includes(
        'url("https://discord.com/assets/decf85f79e02d276.png")',
      ),
    ).toBe(false);
    expect(snapshot.includes('url("data:image/png;base64,')).toBe(true);
    expect(
      /url\(["']https:\/\/discord\.com\/assets\/[\w.-]+\.woff2/.test(snapshot),
    ).toBe(false);
    expect(snapshot.includes("data:font/woff2;base64,")).toBe(true);
  });

  it("contains a compact server rail with populated folders and bundled image examples", () => {
    const body = readFileSync(
      "src/features/preview/fixture/discord-body.html",
      "utf8",
    );
    const document = new DOMParser().parseFromString(body, "text/html");
    const rail = document.querySelector(".guilds__5e434")!;
    expect(rail.querySelectorAll('[data-element="Server icon"]')).toHaveLength(
      7,
    );
    const folders = rail.querySelectorAll("[data-preview-folder]");
    expect(folders).toHaveLength(2);
    for (const folder of folders) {
      const list = document.getElementById(
        folder.getAttribute("aria-controls")!,
      )!;
      expect(list.querySelectorAll('[role="treeitem"]')).toHaveLength(2);
      expect(folder.getAttribute("aria-expanded")).toBe(String(!list.hidden));
      expect(
        folder
          .closest(".folderGroup__48112")!
          .querySelectorAll('[style*="background-image: url"]').length,
      ).toBeGreaterThanOrEqual(2);
    }
    expect(snapshot).not.toContain("/preview-server-");
    expect(snapshot).toContain("data:image/jpeg;base64,");
  });

  it("shows a selected server pill and a tooltip using native Discord classes", () => {
    const body = readFileSync(
      "src/features/preview/fixture/discord-body.html",
      "utf8",
    );
    const document = new DOMParser().parseFromString(body, "text/html");
    const selected = document.querySelector(
      '.guilds__5e434 [data-element="Server icon"][aria-selected="true"]',
    )!;
    expect(
      selected
        .closest(".listItem__650eb")!
        .querySelector(".item__58105.selected__58105.visible__58105"),
    ).not.toBeNull();
    const tooltip = document.getElementById(
      selected.getAttribute("aria-describedby")!,
    )!;
    expect(tooltip.getAttribute("role")).toBe("tooltip");
    expect(tooltip.classList.contains("tooltipPrimary_c36707")).toBe(true);
    expect(tooltip.querySelector(".tooltipPointer_c36707")).not.toBeNull();
    expect(tooltip.querySelector(".tooltipContent_c36707")!.textContent).toBe(
      "Midnight studio",
    );
    expect(tooltip.closest(".layerContainer__59d0d")).not.toBeNull();
    expect(tooltip.closest("[hidden]")).toBeNull();
  });

  it("injects only the trusted bootstrap and toggles resource permissions", () => {
    for (const external of [false, true]) {
      const html = fixtureDocument("testnonce", external, snapshot);
      const document = new DOMParser().parseFromString(
        html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""),
        "text/html",
      );
      expect(document.querySelectorAll("script")).toHaveLength(1);
      expect(document.querySelector("script")?.nonce).toBe("testnonce");
      expect(
        () => new Function(document.querySelector("script")!.textContent!),
      ).not.toThrow();
      const csp = document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')!
        .getAttribute("content")!;
      expect(csp).toContain("script-src 'nonce-testnonce'");
      expect(csp.includes("https:")).toBe(external);
      expect(csp).toContain("connect-src 'none'");
      expect(html).not.toContain("<!--BD_HEAD-->");
    }
  });
});
