import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { readNotice } from "../lib/data/notice";

// An async Server Component: it awaits its own data from the data layer, under the page's <Suspense>.
export async function Notice(): Promise<ReactNode> {
  const notice = await readNotice();
  return <Typography>{notice.text}</Typography>;
}
