import { useRecordContext, useTranslate } from "ra-core";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact } from "../types";

/**
 * The contact status (cold, warm, hot, in contract) is computed by the
 * database from the contact's deals, so it is shown, not edited.
 */
export const ContactStatusBadge = () => {
  const record = useRecordContext<Contact>();
  const translate = useTranslate();
  const { noteStatuses } = useConfigurationContext();
  if (!record) return null;
  const status = noteStatuses.find((item) => item.value === record.status);
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-2 text-base font-medium">
        <span
          className="size-3 rounded-full"
          style={{ backgroundColor: status?.color ?? "#94a3b8" }}
        />
        {status?.label ??
          translate("resources.contacts.background.status_none")}
      </span>
      <span className="text-xs text-muted-foreground">
        {translate("resources.contacts.status_auto_hint")}
      </span>
    </div>
  );
};
