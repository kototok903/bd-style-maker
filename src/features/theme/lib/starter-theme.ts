export const starterTheme = `/**
 * @name Midnight
 * @author Your name
 * @description A quiet place to make things.
 * @version 1.0.0
 */

/* A starting palette. These are Discord-style theme variables. */
:root {
  --brand-500: #a7b7ff;
  --background-primary: #242733;
  --background-secondary: #20232f;
  --background-tertiary: #191c26;
  --text-normal: #dce0ee;
  --text-muted: #9ca4bc;
  --radius: 10px;
}

/* These selectors are also included in the bundled preview fixture. */
[class*="message_"] {
  border-radius: var(--radius);
}

[class*="channelTextArea_"] {
  background-color: var(--background-tertiary);
  border-radius: var(--radius);
}

[class*="embedFull_"] {
  border-color: var(--brand-500);
  border-radius: var(--radius);
}
`;

export const emptyTheme = `/**
 * @name Untitled
 * @author Your name
 * @description My BetterDiscord theme.
 * @version 0.1.0
 */

:root {
}
`;
