// Self-contained: injected into the isolated preview, never the live client.
export function createInspector(send, groups) {
  // Detail targets are available in the hierarchy; clicks initially prefer the
  // containing component so text/icon wrappers don't steal every selection.
  const targets = groups.flatMap((group) => group.targets);
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
