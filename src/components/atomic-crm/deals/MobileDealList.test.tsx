import { render } from "vitest-browser-react";
import { buildCompany, buildDeal, StoryWrapper } from "@/test/StoryWrapper";

const mockIsMobile = vi.hoisted(() => vi.fn(() => true));
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockIsMobile,
}));

describe("MobileDealList", () => {
  it("lists deals by status and shows how the follow-up is going", async () => {
    const screen = await render(
      <StoryWrapper
        data={{
          companies: [buildCompany({ id: 1, name: "IDMA Automation" })],
          deals: [
            buildDeal({ id: 1, name: "Belt line", stage: "sent" }),
            buildDeal({ id: 2, name: "Old project", stage: "won" }),
          ],
          deal_activities: [
            {
              id: 1,
              deal_id: 1,
              sales_id: 0,
              date: "2026-11-02T10:00:00.000Z",
              channel: "call",
              answered: false,
            },
          ],
        }}
        initialEntries={["/oportunidades"]}
      >
        {null}
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Belt line")).toBeVisible();
    await expect.element(screen.getByText("No answer")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: /Enviada/ }))
      .toHaveAttribute("aria-expanded", "true");

    // Closed deals stay folded until the section is opened
    await expect
      .element(screen.getByText("Old project"))
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: /Ganada/ }).click();
    await expect.element(screen.getByText("Old project")).toBeVisible();
  });
});
