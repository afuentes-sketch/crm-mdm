import { Draggable } from "@hello-pangea/dnd";
import { useLocaleState, useRedirect, RecordContextProvider } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { Card, CardContent } from "@/components/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";

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
          className={`py-1.5 gap-0 rounded-md transition-all duration-200 ${
            snapshot?.isDragging
              ? "opacity-90 rotate-1 shadow-lg"
              : "shadow-sm hover:shadow-md hover:border-primary/40"
          }`}
        >
          <CardContent className="px-2.5 flex flex-row items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight break-words">
                {deal.name}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground mt-0.5">
                {formatDealAmount(deal.amount, getDealCurrency(deal), locale, {
                  compact: true,
                })}
              </p>
            </div>
            {/* Colored initial of the company, as on the original cards */}
            <ReferenceField
              source="company_id"
              reference="companies"
              link={false}
            >
              <CompanyAvatar width={20} height={20} />
            </ReferenceField>
          </CardContent>
        </Card>
      </RecordContextProvider>
    </div>
  );
};
