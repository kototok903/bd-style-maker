import "@testing-library/jest-dom/vitest";

// JSDOM does not implement the Web Animations API used by Base UI's scroll area.
Element.prototype.getAnimations ??= () => [];
