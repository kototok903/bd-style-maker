import { readFileSync } from "node:fs";

import { afterEach, expect, it, vi } from "vitest";

const bootstrap = readFileSync(
  "src/features/preview/fixture/bootstrap.js",
  "utf8",
);
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  delete document.body.dataset.inspect;
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});

function fixture() {
  document.body.innerHTML = `<style id="theme-source"></style><main data-element="Chat" data-selector=".chat"><article class="message" data-element="Message" data-selector=".message"><span id="text">Sample</span></article></main><div class="folderGroup__48112"><button data-preview-folder aria-controls="servers" aria-expanded="false">Creative</button><div id="servers" hidden></div></div>`;
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
  new Function(bootstrap)();
  windowEvents.get("message")!(
    new MessageEvent("message", {
      source: window.parent,
      data: { type: "bd-init", token: "fixture-token" },
      ports: [port as unknown as MessagePort],
    }),
  );
  return {
    port,
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

it("highlights the nearest preview area and selects a local rule without navigating", () => {
  const f = fixture();
  f.update(true, [
    { id: "root", selector: ":root" },
    { id: "message", selector: ".message" },
  ]);
  const target = document.querySelector("#text")!;
  f.dispatch("pointermove", target);
  const outline = document.querySelector<HTMLElement>("#bd-inspector-outline")!;
  expect(outline.hidden).toBe(false);
  expect(outline.textContent).toBe("Message · .message");
  const click = f.dispatch("click", target);
  expect(click.defaultPrevented).toBe(true);
  expect(f.port.postMessage).toHaveBeenCalledWith({
    type: "selected",
    name: "Message",
    selector: ".message",
  });
  expect(outline.hidden).toBe(true);
  expect(document.body.dataset.inspect).toBe("false");
});

it("returns an area's selector even when the theme has no matching local rule, and supports Escape", () => {
  const f = fixture();
  f.update(true);
  f.dispatch("click", document.querySelector("#text")!);
  expect(f.port.postMessage).toHaveBeenCalledWith({
    type: "selected",
    name: "Message",
    selector: ".message",
  });
  f.update(true);
  f.dispatch("keydown", document.body, "Escape");
  expect(f.port.postMessage).toHaveBeenCalledWith({
    type: "inspect-cancelled",
  });
  expect(document.body.dataset.inspect).toBe("false");
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
