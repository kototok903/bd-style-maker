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

  const outline = document.createElement("div");
  outline.id = "bd-inspector-outline";
  outline.hidden = true;
  outline.style.cssText =
    "position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:2px solid #a7b7ff;background:rgba(167,183,255,.08)";
  const label = document.createElement("span");
  label.id = "bd-inspector-label";
  label.hidden = true;
  label.style.cssText =
    "position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;width:max-content;padding:3px 6px;border-radius:3px;background:#a7b7ff;color:#17181b;white-space:normal;overflow-wrap:anywhere;font:12px system-ui,sans-serif";
  document.body.append(outline, label);
  addPreviewSamples();
  const inspector = createInspector(
    (message) => port?.postMessage(message),
    inspectorTargetGroups,
  );
  function highlight(target) {
    outline.hidden = label.hidden = !target;
    if (!target) return;
    const rect = target.element.getBoundingClientRect();
    Object.assign(outline.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    label.textContent = `${target.name} · ${target.selector} · ${target.count} match${target.count === 1 ? "" : "es"}`;
    // The caption has its own viewport-sized box, independent of the target's
    // width. Measure it before deciding which side of the target has room.
    const margin = 8,
      gap = 4;
    label.style.maxWidth = `${Math.min(640, Math.max(1, innerWidth - margin * 2))}px`;
    const caption = label.getBoundingClientRect();
    label.style.left = `${Math.max(margin, Math.min(rect.left, innerWidth - caption.width - margin))}px`;
    const above = rect.top - caption.height - gap;
    const below = rect.bottom + gap;
    label.style.top = `${above >= margin ? above : Math.max(margin, Math.min(below, innerHeight - caption.height - margin))}px`;
  }
  document.addEventListener("pointermove", (event) => {
    highlight(inspect ? inspector.hover(event.target) : null);
  });
  window.addEventListener("resize", () => {
    highlight(inspect ? inspector.current() : null);
  });
  document.addEventListener("pointerleave", () => {
    outline.hidden = label.hidden = true;
  });
  document.addEventListener(
    "scroll",
    () => {
      highlight(inspect ? inspector.current() : null);
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (inspect && event.key === "Escape") {
      event.preventDefault();
      inspect = false;
      inspector.update(false, rules);
      outline.hidden = label.hidden = true;
      document.body.dataset.inspect = "false";
      port?.postMessage({ type: "inspect-cancelled" });
    }
    if (["Enter", " "].includes(event.key) && event.target instanceof Element) {
      if (inspect) {
        event.preventDefault();
        inspector.pick(event.target);
        highlight(inspector.current());
      } else {
        const control = event.target.closest(
          "[data-preview-reaction],[data-preview-spoiler]",
        );
        if (control) {
          event.preventDefault();
          control.click();
        }
      }
    }
    if (
      inspect &&
      event.altKey &&
      ["ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      if (event.key === "ArrowUp") inspector.parent();
      else inspector.child();
      highlight(inspector.current());
    }
  });

  const tooltipAnchor = document.querySelector("[data-preview-tooltip-anchor]");
  const tooltipLayer = document.querySelector("[data-preview-tooltip-layer]");
  function positionTooltip() {
    if (!tooltipAnchor || !tooltipLayer) return;
    const rect = tooltipAnchor.getBoundingClientRect();
    const left = Math.min(
      rect.right + 12,
      innerWidth - tooltipLayer.offsetWidth - 8,
    );
    const top = Math.max(
      8,
      Math.min(
        rect.top + (rect.height - tooltipLayer.offsetHeight) / 2,
        innerHeight - tooltipLayer.offsetHeight - 8,
      ),
    );
    tooltipLayer.style.left = `${Math.max(8, left)}px`;
    tooltipLayer.style.top = `${top}px`;
  }
  if (tooltipAnchor && tooltipLayer) {
    const tooltipObserver = new ResizeObserver(positionTooltip);
    tooltipObserver.observe(tooltipAnchor);
    tooltipObserver.observe(tooltipLayer);
    window.addEventListener("resize", positionTooltip);
    document.addEventListener("scroll", positionTooltip, true);
    positionTooltip();
  }

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
      positionTooltip();
      if (inspect) highlight(inspector.current());
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
          tooltip: sample("#preview-server-tooltip"),
          selectedServer: sample(".guilds__5e434 .item__58105.selected__58105"),
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
  // Keep the message list anchored when the inspector changes the canvas height,
  // unless the user has scrolled away from the end of the conversation.
  const messageScroller = document.querySelector(".scroller__36d07");
  if (messageScroller) {
    let previousHeight = messageScroller.clientHeight;
    let previousContent = messageScroller.scrollHeight;
    const observer = new ResizeObserver(() => {
      const atBottom =
        messageScroller.scrollTop + previousHeight >= previousContent - 8;
      if (atBottom) messageScroller.scrollTop = messageScroller.scrollHeight;
      previousHeight = messageScroller.clientHeight;
      previousContent = messageScroller.scrollHeight;
    });
    observer.observe(messageScroller);
    const content = messageScroller.querySelector(".scrollerInner__36d07");
    if (content) observer.observe(content);
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
      if (m?.type === "inspect-target" && typeof m.id === "string") {
        inspector.navigate(m.id);
        highlight(inspector.current());
        return;
      }
      if (m?.type === "inspect-variant" && typeof m.id === "string") {
        inspector.variant(m.id);
        highlight(inspector.current());
        return;
      }
      if (m?.type === "inspect-parent" || m?.type === "inspect-child") {
        if (m.type === "inspect-parent") inspector.parent();
        else inspector.child();
        highlight(inspector.current());
        return;
      }
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
      if (!inspect) outline.hidden = label.hidden = true;
      document.body.dataset.inspect = String(inspect);
      rules = Array.isArray(m.rules)
        ? m.rules
            .slice(0, 3000)
            .filter(
              (rule) =>
                rule &&
                typeof rule.selector === "string" &&
                typeof rule.id === "string",
            )
        : [];
      inspector.update(inspect, rules);
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
        const spoiler = target.closest("[data-preview-spoiler]");
        if (spoiler) {
          spoiler.classList.toggle("hidden__299eb");
          return;
        }
        const reaction = target.closest("[data-preview-reaction]");
        if (reaction) {
          reaction.classList.toggle("reactionMe__23977");
          return;
        }
        const folderButton = target.closest("[data-preview-folder]");
        if (folderButton) {
          const list = document.getElementById(
            folderButton.getAttribute("aria-controls"),
          );
          if (list) {
            list.hidden = !list.hidden;
            folderButton.setAttribute("aria-expanded", String(!list.hidden));
            folderButton
              .closest(".folderGroup__48112")
              ?.classList.toggle("isExpanded__48112", !list.hidden);
            applied();
          }
          return;
        }
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
      inspector.pick(target);
      highlight(inspector.current());
    },
    true,
  );
})();
