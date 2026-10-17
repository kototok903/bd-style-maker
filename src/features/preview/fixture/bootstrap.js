(() => {
  const token = document.currentScript.nonce;
  const source = document.getElementById("theme-source");
  let port,
    revision = -1,
    inspect = false,
    rules = [],
    positioned = false;
  let native = false,
    resourceState = "loading";
  const regions = [
    ".base__5e434",
    ".sidebar__5e434",
    ".guilds__5e434",
    ".sidebarList__5e434",
    ".panels__5e434",
    ".chat_f75fb0",
    ".chatContent_f75fb0",
    ".subtitleContainer_f75fb0",
    ".channelTextArea_f75fb0",
    ".membersWrap_c8ffbb",
  ];
  // The live Slate editor measures its empty content whenever theme typography
  // changes. Let that same content size naturally instead of freezing the
  // captured JavaScript height (which is wrong after a theme changes padding).
  document
    .querySelectorAll(".slateContainer_ec4baf")
    .forEach((el) => el.style.removeProperty("height"));

  function sample(selector, pseudo) {
    const element = document.querySelector(selector);
    if (!element) return null;
    const c = getComputedStyle(element, pseudo),
      r = element.getBoundingClientRect();
    return {
      background: c.backgroundColor,
      color: c.color,
      font: c.fontFamily,
      radius: c.borderRadius,
      border: c.borderWidth,
      gap: c.gap,
      content: c.content,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      css: Object.fromEntries(
        [
          "display",
          "position",
          "gridTemplateColumns",
          "gridTemplateRows",
          "padding",
          "margin",
          "gap",
          "fontFamily",
          "fontSize",
          "lineHeight",
          "borderRadius",
          "backgroundColor",
        ].map((k) => [k, c[k]]),
      ),
    };
  }
  function applied() {
    if (!port) return;
    requestAnimationFrame(() => {
      if (!positioned) {
        const scroller = document.querySelector(".scroller__36d07");
        if (scroller) {
          scroller.scrollTop = scroller.scrollHeight;
          positioned = true;
        }
      }
      const matches = [];
      for (const rule of rules) {
        if (typeof rule.selector !== "string" || typeof rule.id !== "string")
          continue;
        try {
          if (document.querySelector(rule.selector)) matches.push(rule.id);
        } catch {
          /* Unsupported selector. */
        }
      }
      port.postMessage({
        type: "applied",
        revision,
        matches,
        samples: {
          body: sample("body"),
          channels: sample(".sidebarList__5e434"),
          chat: sample(".chatContent_f75fb0"),
          message: sample(".message__5126c"),
          input: sample(".channelTextArea_f75fb0"),
          label: sample(".sidebarList__5e434", "::after"),
          viewport: { width: innerWidth, height: innerHeight },
          regions: Object.fromEntries(
            regions.map((s) => {
              const result = sample(s);
              return [s, result && { rect: result.rect, css: result.css }];
            }),
          ),
        },
      });
    });
  }
  function resources(status) {
    resourceState = status;
    if (port && native)
      port.postMessage({ type: "resources", revision, status });
    applied();
  }
  source.onload = () => resources("loaded");
  source.onerror = () => resources("failed");
  // Discord reserves space using the measured user-panel height. Themes change
  // that height, so a frozen capture value leaves the channel list misaligned.
  const panels = document.querySelector(".panels__5e434");
  if (panels)
    new ResizeObserver(() => {
      const height = `${Math.round(panels.getBoundingClientRect().height)}px`;
      if (
        document.body.style.getPropertyValue("--custom-app-panels-height") !==
        height
      ) {
        document.body.style.setProperty("--custom-app-panels-height", height);
        applied();
      }
    }).observe(panels, { box: "border-box" });

  window.addEventListener("message", (event) => {
    if (
      event.source !== parent ||
      event.data?.type !== "bd-init" ||
      event.data.token !== token ||
      !event.ports[0] ||
      port
    )
      return;
    port = event.ports[0];
    port.onmessage = (event) => {
      const m = event.data;
      if (
        m?.type !== "update" ||
        typeof m.css !== "string" ||
        m.css.length > 10000000 ||
        !Number.isSafeInteger(m.revision) ||
        m.revision < revision
      )
        return;
      revision = m.revision;
      if (source.textContent !== m.css) {
        native = !!m.native;
        resourceState = "loading";
        source.textContent = m.css;
      } else if (native) resources(resourceState);
      for (const el of document.querySelectorAll(".theme-dark,.theme-light")) {
        el.classList.toggle("theme-light", !!m.light);
        el.classList.toggle("theme-dark", !m.light);
        el.classList.toggle("theme-darker", !m.light);
        el.classList.toggle("images-dark", !m.light);
      }
      inspect = !!m.inspect;
      document.body.dataset.inspect = String(inspect);
      rules = Array.isArray(m.rules) ? m.rules.slice(0, 3000) : [];
      applied();
      document.fonts.ready.then(applied);
    };
    port.start();
    port.postMessage({ type: "ready" });
  });

  document.addEventListener("submit", (e) => e.preventDefault(), true);
  document.addEventListener("beforeinput", (e) => e.preventDefault(), true);
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target;
      if (target.closest("a,form")) event.preventDefault();
      if (!inspect) {
        const toggle = target.closest(
          '[aria-label="Show Member List"],[aria-label="Hide Member List"]',
        );
        const members = document.querySelector(".membersWrap_c8ffbb");
        if (toggle && members) {
          const container = members.closest(".container_c8ffbb") || members;
          container.hidden = !container.hidden;
          toggle.setAttribute(
            "aria-label",
            container.hidden ? "Show Member List" : "Hide Member List",
          );
          toggle.classList.toggle("selected__9293f", !container.hidden);
          applied();
        }
        return;
      }
      if (!port) return;
      event.preventDefault();
      event.stopPropagation();
      const el = target.closest("[data-element]");
      if (!el) return;
      let selector = el.dataset.selector;
      for (const rule of rules) {
        try {
          if (
            rule.selector !== ":root" &&
            rule.selector !== "body" &&
            el.matches(rule.selector)
          ) {
            selector = rule.selector;
            break;
          }
        } catch {
          /* Unsupported selector. */
        }
      }
      port.postMessage({
        type: "selected",
        name: el.dataset.element,
        selector,
      });
    },
    true,
  );
})();
