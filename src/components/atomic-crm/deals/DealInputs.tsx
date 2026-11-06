import { required, useRecordContext, useTranslate } from "ra-core";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { isGuardedStage, STAGE_NEW } from "../followup/followUpRules";
import { DEAL_CURRENCY_CHOICES, DEFAULT_DEAL_CURRENCY } from "./dealCurrency";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal, Sale } from "../types";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";
import { AutocompleteContactInput } from "../contacts/AutocompleteContactInput.tsx";

export const DealInputs = () => {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col gap-10 p-1">
      <DealInfoInputs />

      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <DealLinkedToInputs />
        <Separator orientation={isMobile ? "horizontal" : "vertical"} />
        <DealMiscInputs />
      </div>
    </div>
  );
};

const DealInfoInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <TextInput source="name" validate={required()} helperText={false} />
      <TextInput source="description" multiline rows={3} helperText={false} />
    </div>
  );
};

const DealLinkedToInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h6 className="text-lg font-semibold">
        {translate("resources.deals.inputs.linked_to")}
      </h6>
      <ReferenceInput source="company_id" reference="companies">
        <AutocompleteCompanyInput
          label="resources.deals.fields.company_id"
          validate={required()}
          modal
        />
      </ReferenceInput>

      <ReferenceArrayInput source="contact_ids" reference="contacts_summary">
        <AutocompleteContactInput label="resources.deals.fields.contact_ids" />
      </ReferenceArrayInput>
    </div>
  );
};

const saleOptionText = (sale: Sale) => `${sale.first_name} ${sale.last_name}`;

const DealMiscInputs = () => {
  const { dealStages, dealCategories } = useConfigurationContext();
  const translate = useTranslate();
  const record = useRecordContext<Deal>();
  // Paused, review, won and lost need extra details (resume date, reason,
  // purchase order): they are set from the follow-up page, not from here.
  const stageChoices = dealStages.filter(
    (stage) => !isGuardedStage(stage.value) || stage.value === record?.stage,
  );
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h6 className="text-lg font-semibold">
        {translate("resources.deals.field_categories.misc")}
      </h6>

      <AutocompleteArrayInput
        source="categories"
        choices={dealCategories}
        optionText="label"
        optionValue="value"
        helperText={false}
      />
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <NumberInput
          source="amount"
          defaultValue={0}
          helperText={false}
          validate={required()}
        />
        <SelectInput
          source="currency"
          label="resources.deals.fields.currency"
          choices={DEAL_CURRENCY_CHOICES}
          defaultValue={DEFAULT_DEAL_CURRENCY}
          helperText={false}
          validate={required()}
        />
      </div>
      <DateInput
        validate={required()}
        source="expected_closing_date"
        helperText={false}
        defaultValue={new Date().toISOString().split("T")[0]}
      />
      <SelectInput
        source="stage"
        choices={stageChoices}
        optionText="label"
        optionValue="value"
        defaultValue={STAGE_NEW}
        helperText={false}
        validate={required()}
      />
      <ReferenceInput
        source="sales_id"
        reference="sales"
        sort={{ field: "last_name", order: "ASC" }}
      >
        <SelectInput
          label="resources.deals.fields.sales_id"
          optionText={saleOptionText}
          helperText={false}
          validate={required()}
        />
      </ReferenceInput>
      <TextInput
        source="next_action"
        label="crm.followup.fields.next_action"
        helperText={false}
      />
      <DateInput
        source="next_action_date"
        label="crm.followup.fields.next_action_date"
        helperText={false}
      />
    </div>
  );
};
