// Self-contained: injected into the isolated preview, never the live client.
export function createInspector(send) {
  // Detail targets are available in the hierarchy; clicks initially prefer the
  // containing component so text/icon wrappers don't steal every selection.
  const targets = [
    ["#app-mount", "App"],
    [".base__5e434", "App layout"],
    [".content__5e434", "Main content"],
    [".sidebar__5e434", "Sidebar"],
    [".bar_c38106", "Top title bar"],
    [".title_c38106", "Title bar title", true],
    [".leading_c38106", "Title bar navigation"],
    [".trailing_c38106", "Title bar actions"],
    [".bar_c38106 .clickable__81391", "Title bar button"],
    [".guilds__5e434", "Server rail"],
    [".scroller_ef3116", "Server scroll area"],
    [".tutorialContainer__1f388", "Home button"],
    [".guilds__5e434 .wrapper__6e9f8", "Server button"],
    [".guilds__5e434 .icon__6e9f8", "Server image", true],
    [".guilds__5e434 .item__58105", "Server selected/unread indicator", true],
    [".guilds__5e434 .numberBadge__463b7", "Server notification badge", true],
    [".guildSeparator__252b6", "Server separator"],
    [".guilds__5e434 .circleIconButton__5bc7e", "Server utility button"],
    [".folderGroup__48112", "Server folder"],
    [".folderGroupBackground__48112", "Expanded folder background", true],
    [".folderButton__48112", "Folder button"],
    [".folderIcon__48112", "Folder icon", true],
    [".folderPreview__48112", "Folder thumbnails", true],
    [".folderGuildsList__48112", "Folder server list"],
    [".sidebarList__5e434", "Channel sidebar"],
    [".header_f37cb1", "Server header"],
    [".guildBadgeAndName_f37cb1", "Server name", true],
    [".guildDropdown_f37cb1", "Server dropdown", true],
    [".inviteButton_f37cb1", "Server invite button"],
    [".sidebarList__5e434 .scroller__629e4", "Channel scroll area"],
    [".containerDefault__29444", "Channel category"],
    [".wrapper__29444", "Category heading"],
    [".name__29444", "Category name", true],
    [".icon__29444", "Category collapse arrow", true],
    [".addButton__29444", "Add channel button", true],
    [".wrapper__2ea32", "Channel row"],
    [".containerDefault_c69b6d", "Channel spacing", true],
    [".link__2ea32", "Channel background", true],
    [".name__2ea32", "Channel name", true],
    [".iconContainer__2ea32", "Channel icon", true],
    [".subtitle__2ea32", "Channel status", true],
    [".unread__2ea32", "Channel unread indicator", true],
    [".iconItem_c69b6d", "Channel action button", true],
    [".unreadBar__629e4", "Unread channels bar"],
    [".sectionDivider__629e4", "Channel separator"],
    [".voiceUser__07f91", "Voice participant"],
    [".avatar__07f91", "Voice participant avatar", true],
    [".usernameFont__07f91", "Voice participant name", true],
    [".chat_f75fb0", "Chat panel"],
    [".title_f75fb0", "Channel header"],
    [".channelIcon__9293f", "Header channel icon", true],
    [".titleWrapper__9293f", "Header channel name", true],
    [".topic__6ec1a", "Channel topic", true],
    [".toolbar__9293f", "Header toolbar"],
    [".toolbar__9293f .iconWrapper__9293f", "Header action button"],
    [".searchBar_c322aa", "Search field"],
    [".searchBar_c322aa .editor__25bec", "Search text", true],
    [".chatContent_f75fb0", "Chat content"],
    [".messagesWrapper__36d07", "Message list"],
    [".scroller__36d07", "Message scroll area"],
    [".message__5126c", "Message"],
    [".message__5126c .contents_c19a55", "Message contents", true],
    [".message__5126c .avatar_c19a55", "Message avatar", true],
    [".message__5126c .header_c19a55", "Message author header", true],
    [".message__5126c .username_c19a55", "Message author", true],
    [".message__5126c .timestamp_c19a55", "Message timestamp", true],
    [".messageContent_c19a55", "Message text", true],
    [".message__5126c .botTag__82f07", "Message app badge", true],
    [".message__5126c .clanTagChiplet_c19a55", "Message clan badge", true],
    [".message__5126c .buttons__5126c", "Message action toolbar"],
    [".hoverBarButton_f84418", "Message action button"],
    [".divider__5126c", "Message divider"],
    [".divider__5126c .content__908e2", "Divider label", true],
    [".unreadPill__908e2", "Unread divider label", true],
    [".embedFull__623de", "Embed card"],
    [".embedProvider__623de", "Embed provider", true],
    [".embedTitle__623de", "Embed title", true],
    [".embedDescription__623de", "Embed description", true],
    [".embedMedia__623de", "Embed image", true],
    [".imageWrapper_af017a", "Attachment image"],
    [".messageContent_c19a55 pre", "Code block"],
    [".messageContent_c19a55 code", "Code text", true],
    [".messageContent_c19a55 blockquote", "Quote"],
    [".messageContent_c19a55 .mention", "Mention", true],
    [".messageContent_c19a55 .spoilerContent__299eb", "Spoiler", true],
    [".repliedMessage_c19a55", "Reply preview"],
    [".repliedTextContent_c19a55", "Reply text", true],
    [".reaction__23977", "Reaction"],
    [".reactionCount__23977", "Reaction count", true],
    [".membersWrap_c8ffbb", "Member sidebar"],
    [".members_c8ffbb", "Member list"],
    [".membersGroup_c8ffbb", "Member group heading"],
    [".membersGroupName_c8ffbb", "Member group name", true],
    [
      ".membersGroupHeader_c8ffbb > span:last-child",
      "Member group count",
      true,
    ],
    [".member_c8ffbb", "Member row"],
    [".member_c8ffbb .childContainer__91a9d", "Member background", true],
    [".member_c8ffbb .avatar__91a9d", "Member avatar", true],
    [".member_c8ffbb .avatar__44b0c", "Member avatar image", true],
    [".member_c8ffbb .pointerEvents__44b0c", "Member presence indicator", true],
    [".member_c8ffbb .name__91a9d", "Member name", true],
    [".member_c8ffbb .username__703b9", "Member username text", true],
    [".member_c8ffbb .subText__91a9d", "Member status/activity", true],
    [".member_c8ffbb .botTag__82f07", "Member app badge", true],
    [".member_c8ffbb .clanTag__5d473", "Member clan badge", true],
    [".members_c8ffbb .container__0f2e8", "Member activity card"],
    [".members_c8ffbb .titleButton__1692d", "Activity title", true],
    [".members_c8ffbb .thumbnailButton__1692d", "Activity image", true],
    [".form_f75fb0", "Composer region"],
    [".channelTextArea_f75fb0", "Message composer"],
    [
      ".channelTextArea_f75fb0 .scrollableContainer__74017",
      "Composer surface",
      true,
    ],
    [".channelTextArea_f75fb0 .textArea__74017", "Composer text area", true],
    [
      ".channelTextArea_f75fb0 .placeholder__1b31f",
      "Composer placeholder",
      true,
    ],
    [".attachButton__0923f", "Attachment button"],
    [".channelTextArea_f75fb0 .buttons__74017", "Composer toolbar"],
    [".channelTextArea_f75fb0 .button__74017", "Composer utility button"],
    [".button_e6e74f", "Composer apps button"],
    [".typing_b88801", "Typing indicator"],
    [".panels__5e434", "User panel"],
    [".accountPopoutButton__37e49", "Account button"],
    [".avatar__37e49", "Account avatar", true],
    [".nameTag__37e49", "Account name/status", true],
    [".panels__5e434 .title_b6c092", "Account name", true],
    [".panels__5e434 .subtext__339d0", "Account status", true],
    [".buttons__37e49", "Account controls"],
    [".buttons__37e49 button", "Account control button"],
    [".panels__5e434 .connection_e131a9", "Voice connection"],
    [".panels__5e434 .actionButtons_e131a9", "Voice connection controls"],
    [".wrapper__44b0c .pointerEvents__44b0c", "Presence indicator", true],
    [".tooltip_c36707", "Tooltip"],
    [".tooltipContent_c36707", "Tooltip text", true],
    [".tooltipPointer_c36707", "Tooltip pointer", true],
  ];
  const states = [
    ["Selected", ".wrapper__2ea32", ".modeSelected__2ea32"],
    ["Unread", ".wrapper__2ea32", ".modeUnreadImportant__2ea32"],
    ["Muted", ".wrapper__2ea32", ".modeMuted__2ea32"],
    ["Muted", ".wrapper__29444", ".muted__29444"],
    ["Selected", ".wrapper__6e9f8", "[aria-selected='true']"],
    ["Expanded", ".folderGroup__48112", ".isExpanded__48112"],
    ["Collapsed", ".folderGroup__48112", ":not(.isExpanded__48112)"],
    ["Offline", ".member_c8ffbb", ".offline__5d473"],
    ["Online", ".member_c8ffbb", ":not(.offline__5d473)"],
    ["Selected", ".member_c8ffbb", "[aria-selected='true']"],
    ["Speaking", ".voiceUser__07f91", ":has(.usernameSpeaking__07f91)"],
    ["Selected", ".message__5126c", ".selected__5126c"],
    ["Mentioned", ".message__5126c", ".mentioned__5126c"],
    ["Unread", ".divider__5126c", ".isUnread__908e2"],
    ["Highlighted", ".reaction__23977", ".reactionMe__23977"],
    ["Hidden", ".spoilerContent__299eb", ".hidden__299eb"],
  ];
  const known = new WeakMap();
  for (const [selector, name, detail] of targets) {
    for (const el of document.querySelectorAll(selector)) {
      // Explicit, specific entries take precedence over generic captured labels.
      if (!known.has(el)) known.set(el, { selector, name, detail });
    }
  }
  for (const el of document.querySelectorAll("[data-element][data-selector]")) {
    if (!known.has(el))
      known.set(el, {
        name: el.dataset.element,
        selector: el.dataset.selector,
      });
  }
  const ids = new WeakMap(),
    elements = new Map();
  let nextId = 0,
    pinned = null,
    hit = null,
    variant = "base",
    enabled = false;
  function count(selector) {
    try {
      return document.querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  }
  function raw(el) {
    const cls = [...el.classList].find(
      (name) =>
        !/^(theme-|images-|selected|mode|offline|muted|hover|focus|isExpanded)/.test(
          name,
        ),
    );
    let selector = cls ? `.${CSS.escape(cls)}` : el.localName;
    const parent = el.parentElement;
    if (parent && parent !== document.body) {
      const scope = known.get(parent);
      if (scope) selector = `${scope.selector} > ${selector}`;
    }
    return {
      name: `${el.localName}${cls ? `.${cls}` : ""}`,
      selector,
      detail: true,
    };
  }
  function info(el) {
    if (!ids.has(el)) {
      const id = String(++nextId);
      ids.set(el, id);
      elements.set(id, el);
    }
    const target = known.get(el) || raw(el);
    return {
      id: ids.get(el),
      name: target.name,
      selector: target.selector,
      count: count(target.selector),
    };
  }
  function normalize(target) {
    if (
      !(target instanceof Element) ||
      target.closest("#bd-inspector-outline,#bd-inspector-label")
    )
      return null;
    // SVG shapes are implementation details, except annotated presence indicators.
    return target instanceof SVGElement && !known.has(target)
      ? target.closest("svg")
      : target;
  }
  function initial(target) {
    let detail = null;
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      const candidate = known.get(el);
      if (!candidate) continue;
      if (!candidate.detail) return el;
      detail ??= el;
    }
    return detail || target;
  }
  function path(el) {
    const result = [];
    for (
      let node = el;
      node && node !== document.body;
      node = node.parentElement
    )
      if (node === el || known.has(node)) result.unshift(info(node));
    return result;
  }
  function children(el) {
    const result = [];
    function visit(parent) {
      for (const child of parent.children) {
        if (
          result.length >= 100 ||
          child.closest("[hidden]") ||
          /^(script|style|defs|mask|path)$/.test(child.localName)
        )
          continue;
        if (known.has(child)) result.push(info(child));
        else visit(child);
      }
    }
    visit(el);
    if (!result.length)
      for (const child of el.children) {
        if (
          result.length >= 100 ||
          /^(script|style|defs|mask|path)$/.test(child.localName) ||
          child.closest("[hidden]")
        )
          continue;
        result.push(info(child));
      }
    return result;
  }
  function variants(el) {
    const base = info(el).selector;
    const result = [
      {
        id: "base",
        name: "All of this type",
        selector: base,
        kind: "base",
        count: count(base),
      },
    ];
    for (const [name, scope, condition] of states) {
      const owner = el.closest(scope);
      if (!owner) continue;
      const selector =
        owner === el
          ? `:is(${base})${condition}`
          : `${scope}${condition} :is(${base})`;
      result.push({
        id: selector,
        name,
        selector,
        kind: "state",
        count: count(selector),
      });
    }
    for (const [name, pseudo] of [
      ["Hover", ":hover"],
      ["Keyboard focus", ":focus-visible"],
    ]) {
      const selector = `:is(${base})${pseudo}`;
      result.push({
        id: selector,
        name,
        selector,
        kind: "pseudo",
        count: count(base),
      });
    }
    for (const rule of localRules) {
      if (
        typeof rule.selector !== "string" ||
        rule.selector.length > 3000 ||
        /^(?::root|html|body|\*|\.theme-(?:dark|light))$/.test(rule.selector)
      )
        continue;
      try {
        if (
          el.matches(rule.selector) &&
          !result.some((item) => item.selector === rule.selector)
        )
          result.push({
            id: rule.selector,
            name: `Existing rule: ${rule.selector}`,
            selector: rule.selector,
            kind: "rule",
            count: count(rule.selector),
          });
      } catch {
        /* Invalid or pseudo-element selector. */
      }
      if (result.length >= 50) break;
    }
    return result;
  }
  let localRules = [];
  let currentChoices = [];
  function publish() {
    if (!pinned?.isConnected) return;
    const choices = variants(pinned);
    currentChoices = choices;
    if (!choices.some((item) => item.id === variant)) variant = "base";
    send({
      type: "inspection",
      selection: {
        path: path(pinned),
        children: children(pinned),
        variants: choices,
        variant,
        hit: hit && hit !== pinned ? info(hit) : null,
      },
    });
  }
  return {
    update(active, rules) {
      enabled = active;
      localRules = rules;
      if (!active) {
        pinned = hit = null;
        variant = "base";
      } else if (pinned) publish();
    },
    hover(target) {
      if (!enabled) return null;
      if (pinned) return this.current();
      const el = initial(normalize(target));
      return el ? { element: el, ...info(el) } : null;
    },
    pick(target) {
      if (!enabled) return;
      hit = normalize(target);
      if (!hit) return;
      pinned = initial(hit);
      variant = "base";
      publish();
    },
    navigate(id) {
      const el = elements.get(id);
      if (!enabled || !el?.isConnected) return;
      pinned = el;
      variant = "base";
      publish();
    },
    variant(id) {
      if (enabled && pinned) {
        variant = id;
        publish();
      }
    },
    parent() {
      if (!enabled || !pinned) return;
      const ancestors = path(pinned);
      if (ancestors.length > 1) this.navigate(ancestors.at(-2).id);
    },
    child() {
      if (!enabled || !pinned) return;
      const first = children(pinned)[0];
      if (first) this.navigate(first.id);
    },
    current() {
      if (!pinned) return null;
      const choice = currentChoices.find((item) => item.id === variant);
      if (!choice || choice.id === "base" || choice.kind === "pseudo")
        return { element: pinned, ...info(pinned) };
      const element = pinned.matches(choice.selector)
        ? pinned
        : document.querySelector(choice.selector);
      return element
        ? {
            element,
            ...info(pinned),
            selector: choice.selector,
            count: choice.count,
          }
        : null;
    },
  };
}
