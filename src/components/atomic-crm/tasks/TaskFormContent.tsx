import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { required } from "ra-core";
import { DateTimeInput } from "@/components/admin";

import { contactOptionText } from "../misc/ContactOption";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Sale } from "../types";

const saleOptionText = (sale: Sale) => `${sale.first_name} ${sale.last_name}`;

export const TaskFormContent = ({
  selectContact,
}: {
  /** Task created from a list: pick its contact (optional) and its owner. */
  selectContact?: boolean;
}) => {
  const { taskTypes } = useConfigurationContext();
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        // focused by FormDrawer once open: autoFocus would fire while the drawer
        // still slides in, and iOS would scroll the form out of view
        data-autofocus
        source="text"
        validate={required()}
        multiline
        className="m-0"
        helperText={false}
      />
      {selectContact && (
        <>
          <ReferenceInput
            source="sales_id"
            reference="sales"
            sort={{ field: "last_name", order: "ASC" }}
          >
            <SelectInput
              label="resources.tasks.fields.sales_id"
              optionText={saleOptionText}
              helperText={false}
              validate={required()}
            />
          </ReferenceInput>
          {/* Optional: leave it empty for a general task */}
          <ReferenceInput source="contact_id" reference="contacts_summary">
            <AutocompleteInput
              label="resources.tasks.fields.contact_id"
              optionText={contactOptionText}
              helperText={false}
              modal
            />
          </ReferenceInput>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateTimeInput
          source="due_date"
          helperText={false}
          validate={required()}
        />
        <SelectInput
          source="type"
          validate={required()}
          choices={taskTypes}
          optionText="label"
          optionValue="value"
          defaultValue="none"
          helperText={false}
        />
      </div>
    </div>
  );
};
