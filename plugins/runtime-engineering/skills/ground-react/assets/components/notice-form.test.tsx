import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { NoticeForm } from "./notice-form";
import type { NoticeFormState } from "./notice-form";

/** A stand-in for the Server Function that answers `status` and keeps what the form sent. */
function fakeAction(status: NoticeFormState["status"]): {
  action: (previous: NoticeFormState, formData: FormData) => Promise<NoticeFormState>;
  sentTexts: FormDataEntryValue[];
} {
  const sentTexts: FormDataEntryValue[] = [];
  return {
    sentTexts,
    action: (_previous, formData) => {
      sentTexts.push(...formData.getAll("text"));
      return Promise.resolve({ status });
    },
  };
}

test("the form sends what was typed and says the notice changed", async () => {
  const user = userEvent.setup();
  const { action, sentTexts } = fakeAction("saved");
  render(<NoticeForm action={action} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();

  await user.type(screen.getByRole("textbox", { name: "New notice" }), "Closed Friday");
  await user.click(screen.getByRole("button", { name: "Change notice" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Notice changed.");
  expect(sentTexts).toEqual(["Closed Friday"]);
});

test("a refusal from the server is shown in words a person can act on", async () => {
  const user = userEvent.setup();
  render(<NoticeForm action={fakeAction("signed-out").action} />);

  await user.type(screen.getByRole("textbox", { name: "New notice" }), "Closed Friday");
  await user.click(screen.getByRole("button", { name: "Change notice" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to change the notice.");
});

test("text the server finds invalid is answered with the limit", async () => {
  const user = userEvent.setup();
  render(<NoticeForm action={fakeAction("invalid-text").action} />);

  await user.type(screen.getByRole("textbox", { name: "New notice" }), "x");
  await user.click(screen.getByRole("button", { name: "Change notice" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Write a notice of 1 to 200 characters.");
});
