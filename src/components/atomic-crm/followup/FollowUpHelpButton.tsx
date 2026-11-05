import { CircleHelp } from "lucide-react";
import { useTranslate } from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STEPS = [1, 2, 3, 4, 5, 6, 7];

/** Optional step-by-step guide; nothing changes unless it is opened. */
export const FollowUpHelpButton = () => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="h-11 text-base"
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="size-5" />
        {translate("crm.followup.help.button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {translate("crm.followup.help.title")}
            </DialogTitle>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-base leading-relaxed">
            {STEPS.map((step) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {step}
                </span>
                <span>{translate(`crm.followup.help.step_${step}`)}</span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button
              size="lg"
              className="h-12 text-base w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              {translate("crm.followup.help.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
