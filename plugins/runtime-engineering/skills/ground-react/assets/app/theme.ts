"use client";

import { createTheme } from "@mui/material/styles";
import type { PaletteOptions, Theme } from "@mui/material/styles";

// Each palette entry names a custom property from tokens.css, so the token file stays the one
// source. `nativeColor` lets the theme take a `var()` and derive shades in CSS; both schemes
// name the same properties because tokens.css already switches their values for dark.
const palette: PaletteOptions = {
  primary: { main: "var(--color-primary)" },
  error: { main: "var(--color-danger)" },
  background: { default: "var(--color-bg)", paper: "var(--color-surface)" },
  text: { primary: "var(--color-text)", secondary: "var(--color-text-muted)" },
  divider: "var(--color-border)",
};

export const theme: Theme = createTheme({
  cssVariables: { nativeColor: true },
  colorSchemes: { light: { palette }, dark: { palette } },
  typography: { fontFamily: "var(--font-body)" },
  // Space and radius come from the token file too: a step of either is one token.
  spacing: "var(--space-unit)",
  shape: { borderRadius: "var(--radius-unit)" },
});
