// theme.mjs — theme tokens shared by server + client renders (plain JS, no JSX).
export const THEMES = {
  dark: {
    bg: "#0a0a0f", fg: "#e8e8f0", muted: "#9aa0b4", accent: "#6c8cff",
    card: "#141420", border: "#222233",
  },
  light: {
    bg: "#ffffff", fg: "#16161d", muted: "#5b6170", accent: "#3358ff",
    card: "#f5f6fa", border: "#e3e6ef",
  },
};

export const themeOf = (model) => THEMES[model?.theme] || THEMES.dark;
