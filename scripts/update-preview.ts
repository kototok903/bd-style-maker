// Run with Bun. Pin the source revision so previews do not drift between builds.
const revision = "607db5e3e620d4e0851d2d3b443a07a7322ca47a";
const base = `https://raw.githubusercontent.com/Gibbu/ThemePreview/${revision}/`;
const [html, css] = await Promise.all(
  ["index.html", "styles.css"].map(async (path) => {
    const response = await fetch(base + path);
    if (!response.ok)
      throw new Error(`Cannot fetch ${path}: ${response.status}`);
    return response.text();
  }),
);
const cssText = css.replace(
  /url\((["']?)\/assets\//g,
  "url($1https://discord.com/assets/",
);
const selectors = [
  ['[class~="guilds_c48ade"]', "Server list", ".guilds__5e434"],
  ['[class~="sidebarList_c48ade"]', "Channel list", ".sidebarList__5e434"],
  ['[class~="panels_c48ade"]', "User panel", ".panels__5e434"],
  ['[class~="chatContent_f75fb0"]', "Chat", ".chatContent_f75fb0"],
  ['[class~="messagesWrapper__36d07"]', "Messages", ".messagesWrapper__36d07"],
  ['[class~="message__5126c"]', "Message", ".message__5126c"],
  ['[class~="embedFull__623de"]', "Embed", ".embedFull__623de"],
  [
    '[class~="channelTextArea_f75fb0"]',
    "Message input",
    ".channelTextArea_f75fb0",
  ],
  ['[class~="membersWrap_c8ffbb"]', "Members", ".membersWrap_c8ffbb"],
];
let rewriter = new HTMLRewriter()
  .on("script, link, meta, title, #preview", {
    element(element) {
      element.remove();
    },
  })
  .on("head", {
    element(element) {
      element.prepend(
        `<!--BD_HEAD--><style data-discord-base>${cssText}</style><style id="theme-source"></style>`,
        { html: true },
      );
    },
  })
  .on("body", {
    element(element) {
      element.append("<!--BD_SCRIPT-->", { html: true });
    },
  })
  .on("*", {
    element(element) {
      for (const [name, value] of element.attributes) {
        if (name.startsWith("on") || name === "srcdoc")
          element.removeAttribute(name);
        if (
          ["src", "href", "poster"].includes(name) &&
          value.startsWith("/assets/")
        )
          element.setAttribute(name, "https://discord.com" + value);
        if (name === "href" && /^(javascript:|data:)/i.test(value))
          element.removeAttribute(name);
      }
      const classes = element.getAttribute("class");
      if (classes) {
        // Discord's main layout module changed from _c48ade to __5e434. Keep both:
        // the captured base styles use the old class; current themes target the new one.
        const aliases = classes
          .split(/\s+/)
          .filter((c) => c.endsWith("_c48ade"))
          .map((c) => c.replace(/_c48ade$/, "__5e434"));
        if (aliases.length)
          element.setAttribute("class", classes + " " + aliases.join(" "));
      }
    },
  });
for (const [selector, name, target] of selectors)
  rewriter = rewriter.on(selector, {
    element(element) {
      element.setAttribute("data-element", name);
      element.setAttribute("data-selector", target);
    },
  });
const snapshot = await rewriter.transform(new Response(html)).text();
await Bun.write("src/features/preview/fixture/discord-snapshot.html", snapshot);
console.log(
  `Updated Discord preview snapshot from Gibbu/ThemePreview@${revision}.`,
);
