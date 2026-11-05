import { CheckSquare } from "lucide-react";
import {
  useCanAccess,
  useGetIdentity,
  useGetList,
  useTranslate,
  type Identifier,
} from "ra-core";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AddTask } from "../tasks/AddTask";
import { TasksListByDueDate } from "../tasks/TasksListByDueDate";
import type { Sale } from "../types";

const ALL = "all";
const MINE = "mine";

export const TasksList = () => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  // Administrators can follow the salesperson's tasks too
  const { canAccess: isAdmin } = useCanAccess({
    resource: "sales",
    action: "list",
  });
  const [owner, setOwner] = useState<string>(MINE);
  const { data: sales = [] } = useGetList<Sale>(
    "sales",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "last_name", order: "ASC" },
    },
    { enabled: !!isAdmin },
  );

  const items = [
    { value: MINE, label: translate("crm.dashboard.tasks_for.mine") },
    ...sales
      .filter((sale) => sale.id !== identity?.id)
      .map((sale) => ({
        value: String(sale.id),
        label: `${sale.first_name} ${sale.last_name}`,
      })),
    { value: ALL, label: translate("crm.dashboard.tasks_for.all") },
  ];

  const salesId: Identifier | "all" | undefined =
    owner === MINE ? undefined : owner === ALL ? "all" : Number(owner);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <CheckSquare className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          {translate("crm.dashboard.upcoming_tasks", {
            _: "Upcoming Tasks",
          })}
        </h2>
        <AddTask display="icon" selectContact />
      </div>
      {isAdmin ? (
        <Select
          value={owner}
          onValueChange={(value) => setOwner(value ?? MINE)}
          items={items}
        >
          <SelectTrigger
            className="w-full h-11 text-base"
            aria-label={translate("resources.tasks.fields.sales_id")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Card className="p-4 mb-2">
        <div className="flex flex-col gap-4">
          <TasksListByDueDate
            salesId={salesId}
            emptyPlaceholder={
              <p className="text-sm">
                {translate("resources.tasks.empty_list_hint")}
              </p>
            }
          />
        </div>
      </Card>
    </div>
  );
};
