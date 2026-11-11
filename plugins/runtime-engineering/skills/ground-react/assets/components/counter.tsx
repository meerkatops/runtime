"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { ReactNode } from "react";

export interface CounterProps {
  readonly label: string;
}

// A Client Component: it holds state and handles a click, so its file opens the client boundary.
export function Counter({ label }: CounterProps): ReactNode {
  const [count, setCount] = useState(0);
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Typography aria-live="polite">
        {label}: {count}
      </Typography>
      <Button
        variant="contained"
        onClick={() => {
          setCount((previous) => previous + 1);
        }}
      >
        Add one
      </Button>
    </Stack>
  );
}
