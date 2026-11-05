import { ChevronDown, ChevronUp } from "lucide-react";
import { useGetList, useTranslate } from "ra-core";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, NoteStatus } from "../types";

/** Contacts shown per panel before the user expands it. */
const COLLAPSED_COUNT = 5;
const EXPANDED_COUNT = 100;

/** One panel per contact status (cold, warm, hot, in contract). */
export const ContactStatusBoard = () => {
  const { noteStatuses } = useConfigurationContext();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {noteStatuses.map((status) => (
        <StatusPanel key={status.value} status={status} />
      ))}
    </div>
  );
};

const StatusPanel = ({ status }: { status: NoteStatus }) => {
  const translate = useTranslate();
  const [expanded, setExpanded] = useState(false);
  const {
    data: contacts = [],
    total = 0,
    isPending,
  } = useGetList<Contact>("contacts_summary", {
    filter: { status: status.value },
    sort: { field: "last_seen", order: "DESC" },
    pagination: {
      page: 1,
      perPage: expanded ? EXPANDED_COUNT : COLLAPSED_COUNT,
    },
  });

  return (
    <Card
      className="p-4 gap-3"
      style={{ borderTop: `4px solid ${status.color}` }}
    >
      <Link
        to={`/contacts?filter=${encodeURIComponent(
          JSON.stringify({ status: status.value }),
        )}`}
        className="flex items-center justify-between gap-2 no-underline text-inherit"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {status.label}
        </h2>
        <span className="text-base text-muted-foreground">{total}</span>
      </Link>

      {isPending ? null : contacts.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {translate("crm.dashboard.status_empty")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Link
                to={`/contacts/${contact.id}/show`}
                className="flex flex-col rounded-md px-2 py-1.5 no-underline text-inherit hover:bg-muted"
              >
                <span className="text-base font-medium">
                  {contact.first_name} {contact.last_name}
                </span>
                {contact.company_name ? (
                  <span className="text-sm text-muted-foreground">
                    {contact.company_name}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > COLLAPSED_COUNT ? (
        <Button
          variant="ghost"
          className="h-10 text-base"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-4" />
              {translate("crm.common.show_less")}
            </>
          ) : (
            <>
              <ChevronDown className="size-4" />
              {translate("crm.dashboard.show_all", { smart_count: total })}
            </>
          )}
        </Button>
      ) : null}
    </Card>
  );
};
