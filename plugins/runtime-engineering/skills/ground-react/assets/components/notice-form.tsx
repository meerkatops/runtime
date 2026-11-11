"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import type { ReactNode } from "react";

import { MAX_NOTICE_CHARS } from "../lib/notice";
import type { NoticeFailure } from "../lib/notice";

export interface NoticeFormState {
  readonly status: "idle" | "saved" | NoticeFailure;
}

export interface NoticeFormProps {
  /** The Server Function the form submits to; the page passes it in. */
  readonly action: (previous: NoticeFormState, formData: FormData) => Promise<NoticeFormState>;
}

const IDLE: NoticeFormState = { status: "idle" };

const REFUSALS: Readonly<Record<NoticeFailure, string>> = {
  "signed-out": "Sign in to change the notice.",
  "invalid-text": `Write a notice of 1 to ${String(MAX_NOTICE_CHARS)} characters.`,
};

// The result and the pending flag both come from useActionState: the form keeps no state of its own.
export function NoticeForm({ action }: NoticeFormProps): ReactNode {
  const [state, formAction, isPending] = useActionState(action, IDLE);
  return (
    <form action={formAction}>
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        <TextField name="text" label="New notice" required fullWidth />
        <Button type="submit" variant="outlined" loading={isPending}>
          Change notice
        </Button>
        {state.status === "saved" && <Alert severity="success">Notice changed.</Alert>}
        {state.status !== "saved" && state.status !== "idle" && (
          <Alert severity="error">{REFUSALS[state.status]}</Alert>
        )}
      </Stack>
    </form>
  );
}
