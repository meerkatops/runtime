import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { Counter } from "../components/counter";
import { Notice } from "../components/notice";
import { NoticeForm } from "../components/notice-form";
import { changeNotice } from "./actions";

// A Server Component: it renders on the server and ships no JavaScript of its own.
export default function HomePage(): ReactNode {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          App name
        </Typography>
        {/* The read sits under its own boundary, with a fallback shaped like the line that is coming. */}
        <Suspense fallback={<Skeleton variant="text" width="60%" />}>
          <Notice />
        </Suspense>
        <NoticeForm action={changeNotice} />
        <Counter label="Items checked" />
      </Stack>
    </Container>
  );
}
