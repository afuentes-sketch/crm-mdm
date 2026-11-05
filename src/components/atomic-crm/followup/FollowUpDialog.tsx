import { useTranslate } from "ra-core";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Returns true when saved, to close the dialog. */
  onSave: () => Promise<boolean>;
  canSave?: boolean;
  saveLabel?: string;
  children: ReactNode;
}

/** Shared frame of the follow-up dialogs: big, clear fields and buttons. */
export const FollowUpDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onSave,
  canSave = true,
  saveLabel,
  children,
}: FollowUpDialogProps) => {
  const translate = useTranslate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const saved = await onSave();
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-xl">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-base">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="flex flex-col gap-4">{children}</div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 text-base"
              onClick={() => onOpenChange(false)}
            >
              {translate("ra.action.cancel")}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="h-12 text-base"
              disabled={!canSave || saving}
            >
              {saveLabel ?? translate("ra.action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
}

export const TextField = ({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
}: FieldProps & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "url";
}) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id} className="text-base">
      {label}
      {required ? " *" : ""}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 text-base"
    />
  </div>
);

export const TextAreaField = ({
  id,
  label,
  value,
  onChange,
  required,
}: FieldProps & { value: string; onChange: (value: string) => void }) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id} className="text-base">
      {label}
      {required ? " *" : ""}
    </Label>
    <Textarea
      id={id}
      value={value}
      required={required}
      rows={3}
      onChange={(event) => onChange(event.target.value)}
      className="text-base"
    />
  </div>
);

/** Large toggle buttons, easier to hit than radio buttons. */
export const ChoiceButtons = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) => (
  <div className="flex flex-col gap-2">
    <span className="text-base font-medium">{label}</span>
    <div
      className="grid grid-cols-2 gap-2"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          variant={value === option.value ? "default" : "outline"}
          className="h-12 text-base"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  </div>
);
