import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./tokens.css";
import "./global.css";
import { theme } from "./theme";

export const metadata: Metadata = {
  title: "App name",
  description: "What this app is for, in one sentence.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
