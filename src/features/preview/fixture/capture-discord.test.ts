import { readFileSync } from "node:fs";

import { afterEach, expect, it } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
});

it("sanitizes a clone while retaining attributes and SVG references needed by Discord styles", () => {
  document.body.innerHTML = `<div id="app-mount"><div class="base__5e434"><div class="chat_f75fb0" data-has-border="true" data-dnd-name="Private server"><svg><mask id="user-mask"><circle cx="0.8333333333333334"/><rect width="32" height="32"/></mask><rect mask="url(#user-mask)" style="clip-path:url(#user-mask)"/></svg><p class="messageContent_c19a55" data-author-id="123456789012345678">A private conversation</p><a href="https://private.example.com" aria-label="Private channel" id="private-id">Secret</a><img src="https://cdn.discordapp.com/attachments/123/private.png"><div contenteditable="true" data-slate-editor="true">Private draft</div><input value="secret@example.com"><div style="background-image:url(https://private.example.com/image.png)"></div></div></div></div>`;
  const original = document.body.innerHTML;
  const source = readFileSync("scripts/capture-discord.js", "utf8");
  const capture = new Function(
    source.replace("export function", "function") + ";return captureDiscord;",
  )() as () => { html: string };
  const result = capture();
  expect(document.body.innerHTML).toBe(original);
  expect(result.html).not.toMatch(/private|secret|123456789012345678/i);
  const clone = new DOMParser().parseFromString(result.html, "text/html");
  expect(
    clone.querySelector(".chat_f75fb0")?.getAttribute("data-has-border"),
  ).toBe("true");
  expect(
    clone.querySelector("[contenteditable]")?.getAttribute("contenteditable"),
  ).toBe("true");
  expect(clone.querySelector("circle")?.getAttribute("cx")).toBe(
    "0.8333333333333334",
  );
  expect(clone.querySelector("mask")?.id).toBe("fixture-1");
  expect(clone.querySelector("[mask]")?.getAttribute("mask")).toBe(
    "url(#fixture-1)",
  );
  expect(clone.querySelector("a")?.getAttribute("href")).toBe("#");
});
