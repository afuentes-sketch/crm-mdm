import { useGetList } from "ra-core";

import type { Contact } from "../types";
import { ContactStatusBoard } from "./ContactStatusBoard";
import { DashboardStepper } from "./DashboardStepper";
import { DealsChart } from "./DealsChart";
import { TasksList } from "./TasksList";
import { Welcome } from "./Welcome";

export const Dashboard = () => {
  const { total: totalContact, isPending: isPendingContact } =
    useGetList<Contact>("contacts", {
      pagination: { page: 1, perPage: 1 },
    });

  const { total: totalDeal, isPending: isPendingDeal } = useGetList<Contact>(
    "deals",
    {
      pagination: { page: 1, perPage: 1 },
    },
  );

  if (isPendingContact || isPendingDeal) {
    return null;
  }

  if (!totalContact) {
    return <DashboardStepper step={1} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
      <div className="md:col-span-8">
        <div className="flex flex-col gap-6">
          {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
          <ContactStatusBoard />
          {totalDeal ? <DealsChart /> : null}
        </div>
      </div>

      <div className="md:col-span-4">
        <TasksList />
      </div>
    </div>
  );
};
