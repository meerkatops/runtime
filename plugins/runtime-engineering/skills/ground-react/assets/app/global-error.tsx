"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import type { ReactNode } from "react";

import { reportCrash } from "../lib/report-crash";
import type { ErrorPageProps } from "./error";

// Replaces the root layout when it fails, so it brings its own <html> and <body>
// and uses no theme or stylesheet: neither is loaded here.
export default function GlobalError({ error, retry }: ErrorPageProps): ReactNode {
  useEffect(() => {
    reportCrash(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main>
          <h1>The app could not be shown.</h1>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
