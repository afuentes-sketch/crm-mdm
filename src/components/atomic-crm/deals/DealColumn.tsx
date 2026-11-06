import { Droppable } from "@hello-pangea/dnd";
import { useLocaleState } from "ra-core";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import { formatTotalsByCurrency } from "./dealCurrency";
import { findDealLabel } from "./dealUtils";
import { DealCard } from "./DealCard";

export const DealColumn = ({
  stage,
  deals,
}: {
  stage: string;
  deals: Deal[];
}) => {
  const { dealStages } = useConfigurationContext();
  const [locale = "en"] = useLocaleState();
  return (
    <div className="flex-1 min-w-36 pb-8">
      <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/60 px-2 py-2 text-center">
        <h3 className="text-sm font-semibold leading-tight">
          {findDealLabel(dealStages, stage)}
        </h3>
        <p className="text-xs text-muted-foreground">
          {formatTotalsByCurrency(deals, locale)}
        </p>
      </div>
      <Droppable droppableId={stage}>
        {(droppableProvided, snapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className={`flex flex-col rounded-2xl mt-2 gap-1.5 ${
              snapshot.isDraggingOver ? "bg-muted" : ""
            }`}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
