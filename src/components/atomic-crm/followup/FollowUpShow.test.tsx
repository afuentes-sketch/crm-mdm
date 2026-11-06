import type { DataProvider } from "ra-core";
import { render } from "vitest-browser-react";
import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import {
  buildCompany,
  buildDeal,
  createCrmDb,
  StoryWrapper,
} from "@/test/StoryWrapper";

import type { Deal, DealActivity } from "../types";

const renderFollowUp = async (path: string, deal: Partial<Deal> = {}) => {
  const dataProvider = createDataProvider({
    db: createCrmDb({
      companies: [buildCompany({ id: 1, name: "Acme Conveyors" })],
      deals: [
        buildDeal({
          id: 1,
          name: "Belt line",
          stage: "sent",
          ...deal,
        }),
      ],
    }),
    latency: 0,
    silent: true,
  });
  const screen = await render(
    <StoryWrapper dataProvider={dataProvider} initialEntries={[path]}>
      {null}
    </StoryWrapper>,
  );
  return { screen, dataProvider };
};

const getDeal = async (dataProvider: DataProvider) =>
  (await dataProvider.getOne<Deal>("deals", { id: 1 })).data;

const getHistory = async (dataProvider: DataProvider) =>
  (
    await dataProvider.getList<DealActivity>("deal_activities", {
      filter: { deal_id: 1 },
      sort: { field: "id", order: "ASC" },
      pagination: { page: 1, perPage: 50 },
    })
  ).data;

describe("FollowUpShow", () => {
  it("guides a deal from price to authorization to sent", async () => {
    const { screen, dataProvider } = await renderFollowUp("/seguimiento/1", {
      stage: "to-quote",
    });

    await screen.getByRole("button", { name: "Register the price" }).click();
    await screen.getByLabelText("Quote amount").fill("85000");
    await screen.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(async () => (await getDeal(dataProvider)).stage)
      .toBe("to-authorize");

    await screen.getByRole("button", { name: "Authorize" }).click();
    await expect
      .poll(async () => (await getDeal(dataProvider)).stage)
      .toBe("ready-to-send");

    await screen
      .getByRole("button", { name: "Mark as sent to the client" })
      .click();
    await expect
      .poll(async () => (await getDeal(dataProvider)).stage)
      .toBe("sent");
    const deal = await getDeal(dataProvider);
    expect(deal.amount).toBe(85000);
    expect(deal.next_action_date).not.toBeNull();
    expect(deal.quote_sent_date).not.toBeNull();
  });

  it("plans the next attempt one week later when the client does not answer", async () => {
    const { screen, dataProvider } = await renderFollowUp("/seguimiento/1");

    await screen.getByRole("button", { name: "Register contact" }).click();
    await screen.getByRole("radio", { name: "WhatsApp" }).click();
    await screen.getByRole("radio", { name: "No answer" }).click();
    await screen.getByRole("button", { name: "Save" }).click();

    const inOneWeek = new Date();
    inOneWeek.setDate(inOneWeek.getDate() + 7);
    const expected = [
      inOneWeek.getFullYear(),
      String(inOneWeek.getMonth() + 1).padStart(2, "0"),
      String(inOneWeek.getDate()).padStart(2, "0"),
    ].join("-");
    await expect
      .poll(async () => (await getDeal(dataProvider)).next_action_date)
      .toBe(expected);
  });

  it("closes the deal as won only once the purchase order number is given", async () => {
    const { screen, dataProvider } = await renderFollowUp(
      "/seguimiento/1?accion=ganada",
    );

    const confirm = screen
      .getByRole("dialog")
      .getByRole("button", { name: "Won (purchase order)" });
    await expect.element(confirm).toBeDisabled();

    await screen.getByLabelText(/Purchase order number/).fill("OC-2026-118");
    await confirm.click();

    await expect
      .poll(async () => (await getDeal(dataProvider)).stage)
      .toBe("won");
    expect((await getDeal(dataProvider)).po_number).toBe("OC-2026-118");
  });

  it("asks for a reason before marking a deal as lost", async () => {
    const { screen, dataProvider } = await renderFollowUp("/seguimiento/1");

    await screen.getByRole("button", { name: "Mark as lost" }).click();
    const confirm = screen
      .getByRole("dialog")
      .getByRole("button", { name: "Mark as lost" });
    await expect.element(confirm).toBeDisabled();

    await screen.getByLabelText(/Reason/).fill("Chose a local supplier");
    await confirm.click();

    await expect
      .poll(async () => (await getDeal(dataProvider)).lost_reason)
      .toBe("Chose a local supplier");
    expect((await getDeal(dataProvider)).stage).toBe("lost");
  });

  it("changes the status in the same step as an answered contact", async () => {
    const { screen, dataProvider } = await renderFollowUp("/seguimiento/1", {
      stage: "to-quote",
    });

    await screen.getByRole("button", { name: "Register contact" }).click();
    await screen.getByRole("radio", { name: "Call" }).click();
    await screen.getByRole("radio", { name: "Yes, they answered" }).click();
    await screen.getByLabelText("Stage").click();
    await screen
      .getByRole("option", { name: "Enviada · en seguimiento" })
      .click();
    await screen
      .getByLabelText(/Next action/)
      .fill("Call to discuss the quote");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(async () => (await getDeal(dataProvider)).stage)
      .toBe("sent");
    const [activity] = await getHistory(dataProvider);
    expect(activity.answered).toBe(true);
  });

  it("uses the quote amount as the deal amount", async () => {
    const { screen, dataProvider } = await renderFollowUp("/seguimiento/1", {
      amount: 1000,
    });

    await screen.getByRole("button", { name: "Quote", exact: true }).click();
    await screen.getByLabelText("Quote amount").fill("85000");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(async () => (await getDeal(dataProvider)).amount)
      .toBe(85000);
    expect((await getDeal(dataProvider)).quote_amount).toBe(85000);
  });

  it("records a quote in dollars as the deal amount and currency", async () => {
    const { screen, dataProvider } = await renderFollowUp("/seguimiento/1");

    await screen.getByRole("button", { name: "Quote", exact: true }).click();
    await screen.getByRole("radio", { name: "USD" }).click();
    await screen.getByLabelText("Quote amount").fill("12000");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(async () => (await getDeal(dataProvider)).currency)
      .toBe("USD");
    expect((await getDeal(dataProvider)).amount).toBe(12000);
  });
});
