"use client"; // Error boundaries must be Client Components.

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { reportCrash } from "../lib/report-crash";

export interface ErrorPageProps {
  readonly error: unknown;
  readonly retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorPageProps): ReactNode {
  // An effect, because it sends to a system outside React: the crash endpoint.
  useEffect(() => {
    reportCrash(error);
  }, [error]);

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 5 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={retry}>
            Try again
          </Button>
        }
      >
        This page could not be shown.
      </Alert>
    </Container>
  );
}
