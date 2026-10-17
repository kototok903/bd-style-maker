import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { fixtureDocument } from "@/features/preview/fixture/document";

const snapshot = readFileSync(
  "src/features/preview/fixture/discord-snapshot.html",
  "utf8",
);

describe("bundled Discord preview", () => {
  it("preserves real message nesting and both layout class versions", () => {
    const document = new DOMParser().parseFromString(
      snapshot.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""),
      "text/html",
    );
    expect(
      document.querySelector(".guilds_c48ade.guilds__5e434"),
    ).not.toBeNull();
    expect(
      document.querySelector(".sidebarList_c48ade.sidebarList__5e434"),
    ).not.toBeNull();
    expect(
      document.querySelector(".message__5126c .embedFull__623de"),
    ).not.toBeNull();
    expect(document.querySelector(".channelTextArea_f75fb0")).not.toBeNull();
    expect(document.querySelector('[data-element="Message"]')).not.toBeNull();
    expect(snapshot).toContain("<style data-discord-base>");
    expect(snapshot).toContain("--background-primary:");
    expect(document.querySelector("script,link,meta,iframe")).toBeNull();
    for (const element of document.querySelectorAll("*")) {
      expect(
        element.getAttributeNames().some((name) => /^on|^srcdoc$/i.test(name)),
      ).toBe(false);
    }
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
