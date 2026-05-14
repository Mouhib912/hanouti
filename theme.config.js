/** @type {const} */
// White + green harmony.
// Pure white surfaces, deep ink text, two shades of emerald (logo + deep).
// No tomato, no amber pop — discipline is the look.
const themeColors = {
  // Brand — logo emerald + a deeper variant for emphasis
  primary: { light: "#10B981", dark: "#34D399" },
  "primary-deep": { light: "#047857", dark: "#10B981" },
  accent: { light: "#047857", dark: "#10B981" }, // deep emerald (replaces tomato)
  tape: { light: "#10B981", dark: "#34D399" },

  // Surfaces — pure white with a barely-there green tint on cards
  background: { light: "#FFFFFF", dark: "#0B0F0C" },
  "background-elevated": { light: "#FFFFFF", dark: "#141815" },
  surface: { light: "#F5F9F6", dark: "#141815" },
  "surface-strong": { light: "#E8F0EA", dark: "#1B231D" },

  // Text — ink with a subtle green undertone to harmonise
  foreground: { light: "#0F1B14", dark: "#F2F8F4" },
  muted: { light: "#5D6B62", dark: "#9AA89F" },
  "muted-soft": { light: "#8E9990", dark: "#6E7873" },

  // Lines
  border: { light: "#DDE4E0", dark: "#252D27" },
  "border-soft": { light: "#EEF1EE", dark: "#1B231D" },

  // Status — green for success; amber/red kept for genuine alerts only
  success: { light: "#10B981", dark: "#34D399" },
  warning: { light: "#10B981", dark: "#34D399" }, // green-only system
  error: { light: "#9C2A21", dark: "#D7372F" }, // muted dark red (used sparingly)
};

module.exports = { themeColors };
