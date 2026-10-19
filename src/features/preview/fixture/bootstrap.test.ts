import { readFileSync } from "node:fs";

import { afterEach, expect, it, vi } from "vitest";

import type { InspectorSelection } from "@/features/preview/lib/inspector-types";

const bootstrap = readFileSync(
  "src/features/preview/fixture/bootstrap.js",
  "utf8",
);
const inspector = readFileSync(
  "src/features/preview/fixture/inspector.js",
  "utf8",
).replace(/^export /m, "");
const samples = readFileSync(
  "src/features/preview/fixture/sample-content.js",
  "utf8",
).replace(/^export /m, "");
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  delete document.body.dataset.inspect;
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});

function fixture(html?: string) {
  document.body.innerHTML = `<style id="theme-source"></style>${html ?? '<main data-element="Chat" data-selector=".chat"><article class="message" data-element="Message" data-selector=".message"><span id="text">Sample</span></article></main><div class="folderGroup__48112"><button data-preview-folder aria-controls="servers" aria-expanded="false">Creative</button><div id="servers" hidden></div></div>'}`;
  vi.stubGlobal("CSS", {
    escape: (value: string) =>
      value.replace(
        /[^a-zA-Z0-9_-]/g,
        (char) => `\\${char.codePointAt(0)!.toString(16)} `,
      ),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const computedStyle = window.getComputedStyle.bind(window);
  vi.stubGlobal("getComputedStyle", (element: Element) =>
    computedStyle(element),
  );
  const script = document.createElement("script");
  script.nonce = "fixture-token";
  vi.spyOn(document, "currentScript", "get").mockReturnValue(script);
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    callback(0),
  );
  const documentEvents = new Map<string, EventListener>();
  const windowEvents = new Map<string, EventListener>();
  vi.spyOn(document, "addEventListener").mockImplementation(
    (type, listener) => {
      documentEvents.set(type, listener as EventListener);
    },
  );
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
    windowEvents.set(type, listener as EventListener);
  });
  const port = {
    postMessage: vi.fn(),
    start: vi.fn(),
    onmessage: null as ((event: { data: unknown }) => void) | null,
  };
  new Function(`${samples}\n${inspector}\n${bootstrap}`)();
  windowEvents.get("message")!(
    new MessageEvent("message", {
      source: window.parent,
      data: { type: "bd-init", token: "fixture-token" },
      ports: [port as unknown as MessagePort],
    }),
  );
  return {
    port,
    selection() {
      return port.postMessage.mock.calls
        .filter(([m]) => m.type === "inspection")
        .at(-1)?.[0].selection as InspectorSelection;
    },
    command(type: string, id: string) {
      port.onmessage!({ data: { type, id } });
    },
    update(inspect: boolean, rules: { id: string; selector: string }[] = []) {
      port.onmessage!({
        data: { type: "update", css: "", revision: 1, inspect, rules },
      });
    },
    dispatch(type: string, target: Element, key?: string) {
      const event = key
        ? new KeyboardEvent(type, { key, cancelable: true })
        : new MouseEvent(type, { cancelable: true });
      Object.defineProperty(event, "target", { value: target });
      documentEvents.get(type)!(event);
      return event;
    },
  };
}

it("highlights the nearest component and pins its hierarchy without changing CSS", () => {
  const f = fixture();
  f.update(true, [
    { id: "root", selector: ":root" },
    { id: "message", selector: ".message" },
  ]);
  const target = document.querySelector("#text")!;
  f.dispatch("pointermove", target);
  const outline = document.querySelector<HTMLElement>("#bd-inspector-outline")!;
  expect(outline.hidden).toBe(false);
  expect(document.querySelector("#bd-inspector-label")?.textContent).toBe(
    "Message · .message · 1 match",
  );
  const click = f.dispatch("click", target);
  expect(click.defaultPrevented).toBe(true);
  expect(f.selection().path.map((n) => n.name)).toEqual(["Chat", "Message"]);
  expect(f.selection().variants[0]).toMatchObject({
    name: "All of this type",
    selector: ".message",
    count: 1,
  });
  expect(
    f.port.postMessage.mock.calls.some(([m]) => m.type === "selected"),
  ).toBe(false);
  expect(outline.hidden).toBe(false);
  expect(document.body.dataset.inspect).toBe("true");
});

it.each([
  { x: 16, y: 100, width: 20, height: 20, left: 16, top: 64 },
  { x: 1256, y: 0, width: 24, height: 24, left: 952, top: 28 },
  { x: 1256, y: 760, width: 24, height: 24, left: 952, top: 724 },
])(
  "places a readable caption outside the element at ($x, $y)",
  ({ x, y, width, height, left, top }) => {
    const f = fixture();
    f.update(true);
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("innerHeight", 800);
    const element = document.querySelector(".message")!;
    const label = document.querySelector<HTMLElement>("#bd-inspector-label")!;
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
      new DOMRect(x, y, width, height),
    );
    vi.spyOn(label, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 320, 32),
    );
    f.dispatch("pointermove", element);
    expect(label.parentElement).toBe(document.body);
    expect(label.style.width).toBe("max-content");
    expect(label.style.left).toBe(`${left}px`);
    expect(label.style.top).toBe(`${top}px`);
    expect(label.hidden).toBe(false);
    f.update(false);
    expect(label.hidden).toBe(true);
  },
);

it("returns an area's selector even when the theme has no matching local rule, and supports Escape", () => {
  const f = fixture();
  f.update(true);
  f.dispatch("click", document.querySelector("#text")!);
  expect(f.selection().path.at(-1)?.selector).toBe(".message");
  f.update(true);
  f.dispatch("keydown", document.body, "Escape");
  expect(f.port.postMessage).toHaveBeenCalledWith({
    type: "inspect-cancelled",
  });
  expect(document.body.dataset.inspect).toBe("false");
});

it("selects member rows, their inner parts, and offline variants without broadening to the whole list", () => {
  const f = fixture(
    `<aside class="membersWrap_c8ffbb"><div class="members_c8ffbb"><h3 class="membersGroup_c8ffbb">Online</h3><div class="member_c8ffbb"><div class="avatar__91a9d"></div><span class="name__91a9d" id="online-name">Jamie</span></div><h3 class="membersGroup_c8ffbb">Offline</h3><div class="member_c8ffbb offline__5d473"><span class="name__91a9d">Avery</span></div></div></aside>`,
  );
  f.update(true, [{ id: "broad", selector: "div" }]);
  f.dispatch("click", document.querySelector("#online-name")!);
  expect(f.selection().path.at(-1)).toMatchObject({
    name: "Member row",
    selector: ".member_c8ffbb",
    count: 2,
  });
  expect(
    f.selection().variants.find((v) => v.name === "Offline"),
  ).toMatchObject({ count: 1 });
  const avatar = f
    .selection()
    .children.find((n) => n.name === "Member avatar")!;
  f.command("inspect-target", avatar.id);
  expect(f.selection().path.at(-1)?.name).toBe("Member avatar");
  const list = f.selection().path.find((n) => n.name === "Member list")!;
  f.command("inspect-target", list.id);
  expect(
    f.selection().children.filter((n) => n.name === "Member group heading"),
  ).toHaveLength(2);
});

it("returns selectors that match the chosen inner element and state, and permits exact DOM picks", () => {
  const f = fixture(
    `<div class="sidebarList__5e434"><div class="containerDefault_c69b6d wrapper__2ea32 modeSelected__2ea32"><a class="link__2ea32"><span class="name__2ea32" id="channel-name">design-lab</span></a></div><div class="containerDefault_c69b6d wrapper__2ea32"><a class="link__2ea32"><span class="name__2ea32">general</span></a></div></div>`,
  );
  f.update(true);
  f.dispatch("click", document.querySelector("#channel-name")!);
  expect(f.selection().path.at(-1)?.name).toBe("Channel row");
  f.command("inspect-target", f.selection().hit!.id);
  const selected = f.selection().variants.find((v) => v.name === "Selected")!;
  f.command("inspect-variant", selected.id);
  expect(document.querySelectorAll(selected.selector)).toHaveLength(1);
  expect(document.querySelector(selected.selector)?.id).toBe("channel-name");
  expect(f.selection().variant).toBe(selected.id);
});

it("reaches unannotated elements and escaped classes through an exact pick", () => {
  const f = fixture(
    '<main data-element="Chat" data-selector="main"><div class="custom/card" id="custom">Sample</div></main>',
  );
  f.update(true);
  f.dispatch("click", document.querySelector("#custom")!);
  f.command("inspect-target", f.selection().hit!.id);
  const target = f.selection().path.at(-1)!;
  expect(document.querySelector(target.selector)?.id).toBe("custom");
  expect(target.count).toBe(1);
});

it("supports keyboard picking, parent/child navigation, and cancellation", () => {
  const f = fixture();
  f.update(true);
  const text = document.querySelector("#text")!;
  f.dispatch("keydown", text, "Enter");
  expect(f.selection().path.at(-1)?.name).toBe("Message");
  f.command("inspect-parent", "");
  expect(f.selection().path.at(-1)?.name).toBe("Chat");
  f.command("inspect-child", "");
  expect(f.selection().path.at(-1)?.name).toBe("Message");
  f.dispatch("keydown", text, "Escape");
  const calls = f.port.postMessage.mock.calls.length;
  f.command("inspect-child", "");
  expect(f.port.postMessage).toHaveBeenCalledTimes(calls);
});

it("covers the actual Discord bars, lists, groups, folders and sample message components", () => {
  const f = fixture(
    readFileSync("src/features/preview/fixture/discord-body.html", "utf8"),
  );
  f.update(true);
  for (const [selector, name] of [
    [".title_c38106", "Top title bar"],
    [".header_f37cb1", "Server header"],
    [".titleWrapper__9293f", "Channel header"],
    [".member_c8ffbb .name__91a9d", "Member row"],
    [".membersGroupName_c8ffbb", "Member group heading"],
    [".name__2ea32", "Channel row"],
    [".name__29444", "Category heading"],
    [".folderIcon__48112", "Folder button"],
    [".folderGroupBackground__48112", "Server folder"],
    [".icon__6e9f8", "Server button"],
    [".tooltipContent_c36707", "Tooltip"],
    [".repliedMessage_c19a55", "Reply preview"],
    [".reactionCount__23977", "Reaction"],
    [".messageContent_c19a55 blockquote", "Quote"],
    [".typing_b88801", "Typing indicator"],
  ]) {
    const element = document.querySelector(selector)!;
    expect(element, selector).not.toBeNull();
    f.dispatch("click", element);
    const target = f.selection().path.at(-1)!;
    expect(target.name, selector).toBe(name);
    expect(element.closest(target.selector), selector).not.toBeNull();
    expect(target.count).toBeGreaterThan(0);
    expect(target.selector).not.toMatch(/data-(?:preview|element|selector)/);
    if (name === "Channel row")
      expect(
        f.selection().variants.find((item) => item.name === "Selected")?.count,
      ).toBeGreaterThan(0);
  }
  expect(
    document.querySelectorAll(
      ".membersGroupHeader_c8ffbb > span:last-child:not(:empty)",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    document.querySelectorAll(".sidebarList__5e434 .containerDefault__29444"),
  ).toHaveLength(2);
  expect(
    document.querySelectorAll(".sidebarList__5e434 .wrapper__2ea32"),
  ).toHaveLength(7);
  expect(document.querySelectorAll(".voiceUser__07f91")).toHaveLength(3);
});

it("only toggles sample reactions/spoilers when inspection is off", () => {
  const f = fixture(
    readFileSync("src/features/preview/fixture/discord-body.html", "utf8"),
  );
  const reaction = document.querySelector("[data-preview-reaction]")!;
  const spoiler = document.querySelector("[data-preview-spoiler]")!;
  f.update(true);
  f.dispatch("click", reaction);
  expect(reaction.classList.contains("reactionMe__23977")).toBe(true);
  f.dispatch("click", spoiler);
  expect(spoiler.classList.contains("hidden__299eb")).toBe(true);
  f.update(false);
  f.dispatch("click", reaction);
  f.dispatch("click", spoiler);
  expect(reaction.classList.contains("reactionMe__23977")).toBe(false);
  expect(spoiler.classList.contains("hidden__299eb")).toBe(false);
});

it("opens populated folders locally when inspecting is off", () => {
  const f = fixture();
  const button = document.querySelector("button")!;
  f.dispatch("click", button);
  expect(document.querySelector<HTMLElement>("#servers")!.hidden).toBe(false);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  f.dispatch("click", button);
  expect(document.querySelector<HTMLElement>("#servers")!.hidden).toBe(true);
});
