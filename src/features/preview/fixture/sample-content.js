// Static, local-only examples for styles absent from the captured conversation.
export function addPreviewSamples() {
  const channels = document.querySelector(
    ".sidebarList__5e434 .content_d125d2",
  );
  if (channels && !channels.hasAttribute("data-preview-curated-channels")) {
    channels.setAttribute("data-preview-curated-channels", "");
    const groups = [
      ...channels.querySelectorAll(":scope > .containerDefault__29444"),
    ];
    const participants = channels.querySelector(".list__07f91");
    const keep = new Set();
    for (const [index, heading] of groups.slice(0, 2).entries()) {
      keep.add(heading);
      let row = heading.nextElementSibling;
      const rows = [];
      while (
        row?.matches(".containerDefault_c69b6d") &&
        rows.length < (index === 0 ? 3 : 2)
      ) {
        keep.add(row);
        rows.push(row);
        row = row.nextElementSibling;
      }
      if (index === 1 && rows.length) {
        if (participants) rows.at(-1).append(participants);
        for (const [i, voice] of rows.entries()) {
          const name = voice.querySelector(".name__2ea32");
          if (name) name.textContent = ["The lounge", "Quiet room"][i];
        }
      }
    }
    for (const node of [...channels.children]) {
      if (
        node.matches(".containerDefault__29444,.containerDefault_c69b6d") &&
        !keep.has(node)
      )
        node.remove();
    }
  }
  const message = [...document.querySelectorAll(".message__5126c")].at(-1);
  const text = message?.querySelector(".messageContent_c19a55");
  if (text && !text.hasAttribute("data-preview-rich-message")) {
    text.setAttribute("data-preview-rich-message", "");
    text.innerHTML = `<span class="mention wrapper_f61d60" role="link" tabindex="0">@Jamie</span> A few details to make this space yours.
<div class="blockquoteContainer__75297"><div class="blockquoteDivider__75297"></div><blockquote>A quieter place for the next idea.</blockquote></div>
<pre><code class="hljs language-css">:root { --accent: #a7b7ff; }</code></pre>
<span class="spoilerContent__299eb spoilerMarkdownContent__299eb hidden__299eb" data-preview-spoiler role="button" tabindex="0" aria-label="Reveal sample spoiler"><span class="obscuredTextContent__299eb"><span class="obscuredTextContentInner__299eb">A small surprise.</span></span></span>`;
    const reply = document.createElement("div");
    reply.className = "repliedMessage_c19a55";
    reply.innerHTML =
      '<span class="username_c19a55">Jamie</span><div class="repliedTextPreview_c19a55"><span class="repliedTextContent_c19a55">Try changing a color or the corner radius.</span></div>';
    const jamie = [
      ...document.querySelectorAll(".member_c8ffbb .username__703b9"),
    ].find((name) => name.textContent === "Jamie");
    if (jamie)
      reply.querySelector(".username_c19a55").style.color = jamie.style.color;
    message.prepend(reply);
    const reactions = document.createElement("div");
    reactions.className = "reactions__23977";
    reactions.innerHTML =
      '<div class="reaction__23977 reactionMe__23977" data-preview-reaction role="button" tabindex="0" aria-label="Toggle sample reaction"><div class="reactionInner__23977"><span class="emoji">✨</span><span class="reactionCount__23977">3</span></div></div><div class="reaction__23977" data-preview-reaction role="button" tabindex="0" aria-label="Toggle sample heart reaction"><div class="reactionInner__23977"><span class="emoji">♥</span><span class="reactionCount__23977">2</span></div></div>';
    message.append(reactions);
    const divider = [...document.querySelectorAll(".divider__5126c")].at(-1);
    if (divider) {
      divider.classList.add("isUnread__908e2");
      const label = document.createElement("span");
      label.className = "unreadPill__908e2";
      label.textContent = "NEW";
      divider.append(label);
    }
  }
  for (const heading of document.querySelectorAll(".membersGroupName_c8ffbb")) {
    const match = heading.textContent.match(/^(.*?)\s*[—–]\s*(\d+)$/);
    if (match && heading.nextElementSibling) {
      heading.textContent = match[1];
      heading.nextElementSibling.textContent = `— ${match[2]}`;
    }
  }
  const form = document.querySelector(".form_f75fb0");
  if (form && !form.querySelector(".typing_b88801")) {
    const typing = document.createElement("div");
    typing.className =
      "typing_b88801 base_b88801 inTextChannel_b88801 typing_f75fb0";
    typing.innerHTML =
      '<div class="text_b88801"><strong>Jamie</strong> is typing…</div>';
    form.append(typing);
  }
}
