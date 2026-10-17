// Evaluate captureDiscord.toString() in the signed-in browser, then save only its
// returned, sanitized data. It never modifies the live DOM or reads account APIs.
export function captureDiscord() {
  const app = document.querySelector("#app-mount");
  if (!app?.querySelector(".base__5e434"))
    throw new Error("Open a server text channel first.");
  if (document.querySelector("[role=dialog]"))
    throw new Error(
      "Close dialogs and wait for their transition before capturing chat.",
    );
  const clone = app.cloneNode(true);
  clone
    .querySelectorAll(
      "script,style,link,meta,iframe,video,audio,source,track,canvas,input[type=hidden],[role=tooltip]",
    )
    .forEach((e) => e.remove());
  const ids = new Map();
  let nextId = 0;
  const safeId = (id) => {
    if (id === "app-mount") return id;
    if (!ids.has(id)) ids.set(id, "fixture-" + ++nextId);
    return ids.get(id);
  };
  const publicAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";
  const controlLabels = new Set([
    "Inbox",
    "Help",
    "Notification Settings",
    "Pinned Messages",
    "Show Member List",
    "Hide Member List",
    "User Settings",
    "Mute",
    "Deafen",
    "Add Emoji",
    "Apps",
    "More message options",
    "Search",
  ]);
  const sourceElements = [app, ...app.querySelectorAll("*")];
  const elements = [clone, ...clone.querySelectorAll("*")];
  for (const e of elements) {
    for (const attr of [...e.attributes]) {
      const n = attr.name,
        v = attr.value;
      if (
        /^on/i.test(n) ||
        [
          "srcdoc",
          "srcset",
          "poster",
          "data-tooltip-text",
          "data-original-title",
          "autofocus",
        ].includes(n)
      )
        e.removeAttribute(n);
      else if (n === "id") e.setAttribute(n, safeId(v));
      else if (
        [
          "aria-labelledby",
          "aria-describedby",
          "aria-controls",
          "aria-owns",
          "aria-activedescendant",
          "aria-details",
          "aria-errormessage",
          "for",
        ].includes(n)
      )
        e.setAttribute(n, v.split(/\s+/).map(safeId).join(" "));
      else if (n === "href" || n === "xlink:href")
        e.setAttribute(n, v.startsWith("#") ? "#" + safeId(v.slice(1)) : "#");
      else if (n === "src") e.setAttribute(n, publicAvatar);
      else if (n === "style")
        e.setAttribute(
          n,
          v.replace(/url\(([^)]*)\)/gi, (_, path) => {
            const target = path.replace(/['"]/g, "").trim();
            return target.startsWith("#")
              ? "url(#" + safeId(target.slice(1)) + ")"
              : "none";
          }),
        );
      else if (
        [
          "title",
          "alt",
          "aria-label",
          "placeholder",
          "data-placeholder",
          "value",
        ].includes(n)
      )
        e.setAttribute(
          n,
          controlLabels.has(v)
            ? v
            : n.includes("placeholder")
              ? "Message #design-lab"
              : "Preview",
        );
      else if (
        n.startsWith("data-") &&
        ![
          "data-list-item-id",
          "data-list-id",
          "data-text",
          "data-slate-node",
          "data-slate-leaf",
          "data-slate-zero-width",
          "data-slate-length",
          "data-slate-editor",
          "data-slate-placeholder",
          "data-offset-key",
          "data-role",
          "data-can-focus",
          "data-app-not-dev-tools",
          "data-layer",
          "data-fullscreen",
          "data-window-chrome",
          "data-text-variant",
          "data-jump-section",
          "data-collapsed",
          "data-align",
          "data-justify",
          "data-direction",
          "data-wrap",
          "data-full-width",
          "data-guilds-bar-home",
          "data-drop-hovering",
          "data-has-banner",
          "data-banner-visible",
          "data-migration-pending",
          "data-has-border",
          "data-size",
          "data-type",
          "data-live-announcer",
          "data-mana-component",
          "data-layout",
          "data-error",
          "data-disabled",
          "data-settings-sidebar-item",
          "data-nav-anchor-key",
          "data-settings-category-key",
          "data-panel-bottom",
        ].includes(n)
      )
        e.removeAttribute(n);
      else if (n.startsWith("data-"))
        e.setAttribute(n, v.replace(/\d{15,22}/g, "100000000000000001"));
    }
    if (e.matches("img")) {
      e.setAttribute("src", publicAvatar);
      e.setAttribute("alt", "Sample avatar");
    }
    if (e.matches("input,textarea")) {
      e.value = "";
      e.removeAttribute("value");
      e.setAttribute("readonly", "");
    }
    if (e.hasAttribute("contenteditable"))
      e.setAttribute("aria-readonly", "true");
    if (e.matches("svg [fill],svg [mask],svg [clip-path],svg [filter]")) {
      for (const key of ["fill", "mask", "clip-path", "filter"]) {
        const value = e.getAttribute(key);
        if (value?.includes("url(#"))
          e.setAttribute(
            key,
            value.replace(
              /url\(#([^)]*)\)/g,
              (_, id) => "url(#" + safeId(id) + ")",
            ),
          );
      }
    }
  }
  const walker = document.createTreeWalker(
    clone,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT,
  );
  const remove = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.COMMENT_NODE) remove.push(node);
    else if (node.textContent.trim())
      node.textContent = /^\d+$/.test(node.textContent.trim())
        ? "3"
        : "Preview";
  }
  remove.forEach((e) => e.remove());
  const set = (selector, values) =>
    clone.querySelectorAll(selector).forEach((e, i) => {
      const text = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      let first = true;
      while (text.nextNode()) {
        const node = text.currentNode;
        if (
          !node.textContent.trim() ||
          node.parentElement.closest("svg,.hiddenVisually_b18fe2")
        )
          continue;
        node.textContent = first ? values[i % values.length] : "";
        first = false;
      }
      if (first) e.append(document.createTextNode(values[i % values.length]));
    });
  set(".name_f37cb1", ["Midnight studio"]);
  set(".title__9293f", ["design-lab"]);
  set(".title_c38106", ["Midnight studio"]);
  set(".name__29444", [
    "Text channels",
    "Voice channels",
    "Projects",
    "Community",
  ]);
  set(".name__2ea32", [
    "welcome",
    "design-lab",
    "inspiration",
    "off-topic",
    "The lounge",
  ]);
  set(
    ".username_c19a55,.username__5d473,.username__703b9,.username__07f91,.username__91a9d",
    ["Jamie", "Avery", "Morgan"],
  );
  set(".membersGroupName_c8ffbb", ["Online", "Offline"]);
  set(".membersGroup_c8ffbb", ["Activity", "Online — 3", "Offline — 2"]);
  set(".name__91a9d,.name__5d473", ["Jamie", "Avery", "Morgan"]);
  set(".modeSelected__2ea32 .name__2ea32", ["design-lab"]);
  set(".panelTitleContainer__37e49 .title_b6c092", ["Jamie"]);
  set(".panelSubtextContainer__37e49", ["Making things"]);
  set(".numberBadge__463b7", ["3"]);
  set(".unreadMentionsBar_ef3116", ["NEW"]);
  set(".content__908e2", ["October 17, 2026"]);
  set("[class*=botTagText],.tagText__10651,[class*=botText]", ["APP"]);
  set(".placeholder__1b31f", ["Message #design-lab"]);
  set("time", ["10:24 AM"]);
  clone
    .querySelectorAll("time")
    .forEach((e) => e.setAttribute("datetime", "2026-10-17T10:24:00Z"));
  set(".messageContent_c19a55", [
    "A quieter palette for late-night ideas.",
    "Try changing a color or the corner radius in the editor.",
    "Every panel uses the current Discord layout.",
    "A place for your next idea.",
  ]);
  set(".embedTitle__623de", ["Midnight / explorations"]);
  set(".embedDescription__623de", ["Room to focus. Space to make it yours."]);
  set(".embedProvider__623de", ["Studio"]);
  set(".topic__6ec1a", ["A place for your next idea."]);
  // Embedded private images are replaced with a local sample illustration.
  clone
    .querySelectorAll(".embedImage__623de img,[class*=imageWrapper] img")
    .forEach((e) => {
      e.setAttribute("src", "/preview-artwork.svg");
      e.setAttribute("alt", "Sample landscape");
    });
  // Virtualized rows have fixed offsets. Preserve channel/member row geometry,
  // but retain a compact, non-virtual message list with actual message wrappers.
  clone.querySelectorAll(".scrollerInner__36d07 > [style]").forEach((e) => {
    if (
      !e.querySelector(".message__5126c") &&
      /height:/.test(e.getAttribute("style"))
    )
      e.remove();
  });
  clone
    .querySelectorAll("[class*=membersWrap]")
    .forEach((e) => e.classList.remove("hiddenMembers_c8ffbb"));
  const annotations = {
    ".guilds__5e434": "Server list",
    ".sidebarList__5e434": "Channel list",
    ".panels__5e434": "User panel",
    ".chatContent_f75fb0": "Chat",
    ".messagesWrapper__36d07": "Messages",
    ".message__5126c": "Message",
    ".embedFull__623de": "Embed",
    ".channelTextArea_f75fb0": "Message input",
    ".membersWrap_c8ffbb": "Members",
  };
  for (const [selector, name] of Object.entries(annotations))
    clone.querySelectorAll(selector).forEach((e) => {
      e.dataset.element = name;
      e.dataset.selector = selector;
    });
  const selectors = [
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
  const metrics = Object.fromEntries(
    selectors.map((selector) => {
      const e = document.querySelector(selector);
      if (!e) return [selector, null];
      const c = getComputedStyle(e),
        r = e.getBoundingClientRect();
      return [
        selector,
        {
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
        },
      ];
    }),
  );
  return {
    html: clone.outerHTML,
    htmlClass: document.documentElement.className,
    htmlStyle: document.documentElement.getAttribute("style"),
    bodyStyle: document.body.getAttribute("style"),
    viewport: { width: innerWidth, height: innerHeight },
    metrics,
    styles: [...document.styleSheets]
      .filter((s) => s.href?.startsWith("https://discord.com/assets/"))
      .map((s) => ({
        url: s.href,
        media: s.media.mediaText,
        disabled: s.disabled,
      })),
    originalElements: sourceElements.length,
  };
}
