import { render } from "vitest-browser-react";
import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import {
  buildContact,
  buildSale,
  createCrmDb,
  StoryWrapper,
} from "@/test/StoryWrapper";

import type { Task } from "../types";
import { ContactStatusBoard } from "./ContactStatusBoard";
import { TasksList } from "./TasksList";

describe("ContactStatusBoard", () => {
  it("lists a few contacts per status and expands to show them all", async () => {
    const hotContacts = Array.from({ length: 6 }, (_, index) =>
      buildContact({
        id: index + 1,
        first_name: "Hot",
        last_name: `Lead ${index + 1}`,
        status: "hot",
      }),
    );
    const screen = await render(
      <StoryWrapper
        data={{
          contacts: [
            ...hotContacts,
            buildContact({
              id: 10,
              first_name: "Cold",
              last_name: "Prospect",
              status: "cold",
            }),
          ],
        }}
      >
        <ContactStatusBoard />
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Cold Prospect")).toBeVisible();
    await expect.element(screen.getByText("Hot Lead 1")).toBeVisible();
    await expect
      .element(screen.getByText("Hot Lead 6"))
      .not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Show all (6)" }).click();

    await expect.element(screen.getByText("Hot Lead 6")).toBeVisible();
  });
});

describe("TasksList", () => {
  it("creates a general task, without contact, for the salesperson", async () => {
    const dataProvider = createDataProvider({
      db: createCrmDb({
        contacts: [buildContact({ id: 1 })],
        sales: [
          buildSale(),
          buildSale({
            id: 1,
            first_name: "Ruben",
            last_name: "Ramos",
            email: "ruben@example.com",
            administrator: false,
          }),
        ],
      }),
      latency: 0,
      silent: true,
    });
    const screen = await render(
      <StoryWrapper dataProvider={dataProvider}>
        <TasksList />
      </StoryWrapper>,
    );

    await screen.getByRole("button", { name: "Create task" }).click();
    await screen
      .getByRole("textbox", { name: "Description" })
      .fill("Visit the plant");
    await screen.getByRole("combobox", { name: "Assigned to" }).last().click();
    await screen.getByRole("option", { name: "Ruben Ramos" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(async () => {
        const { data } = await dataProvider.getList<Task>("tasks", {
          pagination: { page: 1, perPage: 10 },
          sort: { field: "id", order: "ASC" },
          filter: {},
        });
        return data.map(({ text, sales_id, contact_id }) => ({
          text,
          sales_id,
          contact_id: contact_id ?? null,
        }));
      })
      .toEqual([{ text: "Visit the plant", sales_id: 1, contact_id: null }]);
  });
});
