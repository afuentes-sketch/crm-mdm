import { render } from "vitest-browser-react";
import { buildCompany, StoryWrapper } from "@/test/StoryWrapper";

describe("CompanyList", () => {
  it("drops a saved size or sector filter, which the panel no longer offers", async () => {
    const savedFilter = encodeURIComponent(JSON.stringify({ size: 250 }));
    const screen = await render(
      <StoryWrapper
        data={{
          companies: [
            buildCompany({ id: 1, name: "IDMA Automation", size: 10 }),
          ],
        }}
        initialEntries={[`/companies?filter=${savedFilter}`]}
      >
        {null}
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("IDMA Automation")).toBeVisible();
  });
});
