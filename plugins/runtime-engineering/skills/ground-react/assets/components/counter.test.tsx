import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { Counter } from "./counter";

test("a click adds one to the count", async () => {
  const user = userEvent.setup();
  render(<Counter label="Items checked" />);
  expect(screen.getByText("Items checked: 0")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Add one" }));

  expect(screen.getByText("Items checked: 1")).toBeInTheDocument();
});
