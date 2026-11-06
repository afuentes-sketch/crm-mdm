import { Draggable } from "@hello-pangea/dnd";
import { useRedirect, RecordContextProvider } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { Card, CardContent } from "@/components/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import type { Deal } from "../types";

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
          className={`py-3 gap-0 transition-all duration-200 ${
            snapshot?.isDragging
              ? "opacity-90 rotate-1 shadow-lg"
              : "shadow-sm hover:shadow-md hover:border-primary/40"
          }`}
        >
          <CardContent className="px-3 flex flex-col gap-1.5">
            <p className="text-sm font-semibold leading-snug break-words">
              {deal.name}
            </p>
            <div className="flex items-center gap-1.5 min-w-0">
              <ReferenceField
                source="company_id"
                reference="companies"
                link={false}
              >
                <CompanyAvatar width={20} height={20} />
              </ReferenceField>
              <span className="text-xs text-muted-foreground leading-snug break-words min-w-0">
                <ReferenceField
                  source="company_id"
                  reference="companies"
                  link={false}
                />
              </span>
            </div>
          </CardContent>
        </Card>
      </RecordContextProvider>
    </div>
  );
};
