import { useQueryClient } from "@tanstack/react-query";
import {
  CreateBase,
  Form,
  useCreateContext,
  useDataProvider,
  useGetIdentity,
  useListContext,
  useRedirect,
  useTranslate,
  type GetListResult,
} from "ra-core";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { toISODate } from "../followup/followUpRules";
import { FormToolbar } from "../layout/FormToolbar";
import type { Deal } from "../types";
import { DealInputs } from "./DealInputs";

export const DealCreate = ({ open }: { open: boolean }) => {
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const { data: allDeals } = useListContext<Deal>();

  const handleClose = () => {
    redirect("/deals");
  };

  const queryClient = useQueryClient();

  const onSuccess = async (deal: Deal) => {
    if (!allDeals) {
      redirect("/deals");
      return;
    }
    // increase the index of all deals in the same stage as the new deal
    // first, get the list of deals in the same stage
    const deals = allDeals.filter(
      (d: Deal) => d.stage === deal.stage && d.id !== deal.id,
    );
    // update the actual deals in the database
    await Promise.all(
      deals.map(async (oldDeal) =>
        dataProvider.update("deals", {
          id: oldDeal.id,
          data: { index: oldDeal.index + 1 },
          previousData: oldDeal,
        }),
      ),
    );
    // refresh the list of deals in the cache as we used dataProvider.update(),
    // which does not update the cache
    const dealsById = deals.reduce(
      (acc, d) => ({
        ...acc,
        [d.id]: { ...d, index: d.index + 1 },
      }),
      {} as { [key: string]: Deal },
    );
    const now = Date.now();
    queryClient.setQueriesData<GetListResult | undefined>(
      { queryKey: ["deals", "getList"] },
      (res) => {
        if (!res) return res;
        return {
          ...res,
          data: res.data.map((d: Deal) => dealsById[d.id] || d),
        };
      },
      { updatedAt: now },
    );
    redirect("/deals");
  };

  const { identity } = useGetIdentity();
  const translate = useTranslate();

  // The follow-up starts when the deal is registered. A deal created for
  // someone else is an assignment: remember who assigned it.
  const transform = (data: Deal): Deal => ({
    ...data,
    assigned_by:
      identity?.id != null && data.sales_id !== identity.id
        ? identity.id
        : null,
  });

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="lg:max-w-4xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        <CreateBase
          resource="deals"
          mutationOptions={{ onSuccess }}
          transform={transform}
        >
          <CreateHeader />
          <Form
            defaultValues={{
              sales_id: identity?.id,
              contact_ids: [],
              index: 0,
              next_action: translate("crm.followup.defaults.first_contact"),
              next_action_date: toISODate(new Date()),
            }}
          >
            <DealInputs />
            <FormToolbar />
          </Form>
        </CreateBase>
      </DialogContent>
    </Dialog>
  );
};

const CreateHeader = () => {
  const { defaultTitle } = useCreateContext();
  return (
    <DialogTitle className="text-xl font-semibold">{defaultTitle}</DialogTitle>
  );
};
