// Shared by the isolated preview inspector and the Add selector menu.
// Order matters: the first matching target supplies an element's identity.
export type SelectorTarget = [
  selector: string,
  label: string,
  detail?: boolean,
];
export type SelectorTargetGroup = { label: string; targets: SelectorTarget[] };

export const inspectorTargetGroups: SelectorTargetGroup[] = [
  {
    label: "App and title bar",
    targets: [
      ["#app-mount", "App"],
      [".base__5e434", "App layout"],
      [".content__5e434", "Main content"],
      [".sidebar__5e434", "Sidebar"],
      [".bar_c38106", "Top title bar"],
      [".title_c38106", "Title bar title", true],
      [".leading_c38106", "Title bar navigation"],
      [".trailing_c38106", "Title bar actions"],
      [".bar_c38106 .clickable__81391", "Title bar button"],
    ],
  },
  {
    label: "Servers",
    targets: [
      [".guilds__5e434", "Server rail"],
      [".scroller_ef3116", "Server scroll area"],
      [".tutorialContainer__1f388", "Home button"],
      [".guilds__5e434 .wrapper__6e9f8", "Server button"],
      [".guilds__5e434 .icon__6e9f8", "Server image", true],
      [".guilds__5e434 .item__58105", "Server selected/unread indicator", true],
      [".guilds__5e434 .numberBadge__463b7", "Server notification badge", true],
      [".guildSeparator__252b6", "Server separator"],
      [".guilds__5e434 .circleIconButton__5bc7e", "Server utility button"],
    ],
  },
  {
    label: "Server folders",
    targets: [
      [".folderGroup__48112", "Server folder"],
      [".folderGroupBackground__48112", "Expanded folder background", true],
      [".folderButton__48112", "Folder button"],
      [".folderIcon__48112", "Folder icon", true],
      [".folderPreview__48112", "Folder thumbnails", true],
      [".folderGuildsList__48112", "Folder server list"],
    ],
  },
  {
    label: "Channel sidebar",
    targets: [
      [".sidebarList__5e434", "Channel sidebar"],
      [".header_f37cb1", "Server header"],
      [".guildBadgeAndName_f37cb1", "Server name", true],
      [".guildDropdown_f37cb1", "Server dropdown", true],
      [".inviteButton_f37cb1", "Server invite button"],
      [".sidebarList__5e434 .scroller__629e4", "Channel scroll area"],
    ],
  },
  {
    label: "Channels and categories",
    targets: [
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
    ],
  },
  {
    label: "Voice participants",
    targets: [
      [".voiceUser__07f91", "Voice participant"],
      [".avatar__07f91", "Voice participant avatar", true],
      [".usernameFont__07f91", "Voice participant name", true],
    ],
  },
  {
    label: "Chat and channel header",
    targets: [
      [".chat_f75fb0", "Chat panel"],
      [".title_f75fb0", "Channel header"],
      [".channelIcon__9293f", "Header channel icon", true],
      [".titleWrapper__9293f", "Header channel name", true],
      [".topic__6ec1a", "Channel topic", true],
      [".toolbar__9293f", "Header toolbar"],
      [".toolbar__9293f .iconWrapper__9293f", "Header action button"],
      [".searchBar_c322aa", "Search field"],
      [".searchBar_c322aa .editor__25bec", "Search text", true],
    ],
  },
  {
    label: "Messages",
    targets: [
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
    ],
  },
  {
    label: "Embeds and attachments",
    targets: [
      [".embedFull__623de", "Embed card"],
      [".embedProvider__623de", "Embed provider", true],
      [".embedTitle__623de", "Embed title", true],
      [".embedDescription__623de", "Embed description", true],
      [".embedMedia__623de", "Embed image", true],
      [".imageWrapper_af017a", "Attachment image"],
    ],
  },
  {
    label: "Rich content and reactions",
    targets: [
      [".messageContent_c19a55 pre", "Code block"],
      [".messageContent_c19a55 code", "Code text", true],
      [".messageContent_c19a55 blockquote", "Quote"],
      [".messageContent_c19a55 .mention", "Mention", true],
      [".messageContent_c19a55 .spoilerContent__299eb", "Spoiler", true],
      [".repliedMessage_c19a55", "Reply preview"],
      [".repliedTextContent_c19a55", "Reply text", true],
      [".reaction__23977", "Reaction"],
      [".reactionCount__23977", "Reaction count", true],
    ],
  },
  {
    label: "Members",
    targets: [
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
      [
        ".member_c8ffbb .pointerEvents__44b0c",
        "Member presence indicator",
        true,
      ],
      [".member_c8ffbb .name__91a9d", "Member name", true],
      [".member_c8ffbb .username__703b9", "Member username text", true],
      [".member_c8ffbb .subText__91a9d", "Member status/activity", true],
      [".member_c8ffbb .botTag__82f07", "Member app badge", true],
      [".member_c8ffbb .clanTag__5d473", "Member clan badge", true],
      [".members_c8ffbb .container__0f2e8", "Member activity card"],
      [".members_c8ffbb .titleButton__1692d", "Activity title", true],
      [".members_c8ffbb .thumbnailButton__1692d", "Activity image", true],
    ],
  },
  {
    label: "Message composer",
    targets: [
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
    ],
  },
  {
    label: "Account and voice controls",
    targets: [
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
    ],
  },
  {
    label: "Tooltips",
    targets: [
      [".tooltip_c36707", "Tooltip"],
      [".tooltipContent_c36707", "Tooltip text", true],
      [".tooltipPointer_c36707", "Tooltip pointer", true],
    ],
  },
];

export const selectorPresetGroups: SelectorTargetGroup[] = [
  {
    label: "Theme scopes",
    targets: [
      [":root", "Global variables"],
      [".theme-dark", "Dark appearance"],
      [".theme-light", "Light appearance"],
    ],
  },
  ...inspectorTargetGroups,
];

export const selectorPresets = selectorPresetGroups.flatMap((group) =>
  group.targets.map(([selector, label]) => ({ selector, label })),
);
