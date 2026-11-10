import { useGetList, useTimeout } from "ra-core";
import { Skeleton } from "@/components/ui/skeleton";

import type { Contact } from "../types";
import { ContactStatusBoard } from "./ContactStatusBoard";
import { DashboardStepper } from "./DashboardStepper";
import { TasksList } from "./TasksList";
import { Welcome } from "./Welcome";
import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { useConfigurationContext } from "../root/ConfigurationContext";

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  return (
    <>
      <MobileHeader showRefresh>
        <div className="flex items-center gap-2 text-secondary-foreground no-underline py-3">
          <img
            className="[.light_&]:hidden h-8"
            src={darkModeLogo}
            alt={title}
          />
          <img
            className="[.dark_&]:hidden h-8"
            src={lightModeLogo}
            alt={title}
          />
          <h1 className="sr-only">{title}</h1>
        </div>
      </MobileHeader>
      <MobileContent>{children}</MobileContent>
    </>
  );
};

const Loading = () => (
  <Wrapper>
    <Skeleton className="h-4 w-3/4 mb-4" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-full mb-2" />
  </Wrapper>
);

export const MobileDashboard = () => {
  const { total: totalContact, isPending: isPendingContact } =
    useGetList<Contact>("contacts", {
      pagination: { page: 1, perPage: 1 },
    });
  const oneSecondHasPassed = useTimeout(1000);

  const isPending = isPendingContact;

  if (isPending) {
    return oneSecondHasPassed ? <Loading /> : null;
  }

  if (!totalContact) {
    return (
      <Wrapper>
        <DashboardStepper step={1} />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
        {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
        <div className="md:col-span-12">
          <ContactStatusBoard />
        </div>
        <div className="md:col-span-12">
          <TasksList />
        </div>
      </div>
    </Wrapper>
  );
};
