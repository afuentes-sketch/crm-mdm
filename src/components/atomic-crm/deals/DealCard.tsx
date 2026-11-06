import { Draggable } from "@hello-pangea/dnd";
import { useLocaleState, useRedirect, RecordContextProvider } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Deal } from "../types";
import { formatDealAmount, getDealCurrency } from "./dealCurrency";

export const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  if (!deal) return null;

  return (
    <Draggable draggableId={String(deal.id)} index={index}>
      {(provided, snapshot) => (
        <DealCardContent provided={provided} snapshot={snapshot} deal={deal} />
      )}
    </Draggable>
  );
};

export const DealCardContent = ({
  provided,
  snapshot,
  deal,
}: {
  provided?: any;
  snapshot?: any;
  deal: Deal;
}) => {
  const [locale = "en"] = useLocaleState();
  const redirect = useRedirect();
  const handleClick = () => {
    redirect(`/deals/${deal.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <RecordContextProvider value={deal}>
        <Card
          className={`py-2 gap-0 rounded-lg transition-all duration-200 ${
            snapshot?.isDragging
              ? "opacity-90 rotate-1 shadow-lg"
              : "shadow-sm hover:shadow-md hover:border-primary/40"
          }`}
        >
          <CardContent className="px-3 flex flex-col">
            <p className="text-sm font-semibold leading-snug break-words">
              {deal.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDealAmount(deal.amount, getDealCurrency(deal), locale, {
                compact: true,
              })}
            </p>
          </CardContent>
        </Card>
      </RecordContextProvider>
    </div>
  );
};
