"use client";

import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";

import { updateStream } from "@/actions/stream";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

type FieldTypes = "isChatEnabled" | "isChatDelayed" | "isChatFollowersOnly";

interface ToggleCardProps {
  label: string;
  value: boolean;
  field: FieldTypes;
}
export const ToggleCard = ({
  label,
  value = false,
  field,
}: ToggleCardProps) => {
  const updateAction = useAction(updateStream, {
    onSuccess: () => {
      toast.success("Chat settings were updated successfully.");
    },
    onError: () => {
      toast.error("Something went wrong during the update.");
    },
  });

  const handleChange = (checked: boolean) => {
    updateAction.execute({
      [field]: checked,
    });
  };

  const optimisticValue =
    updateAction.status === "executing"
      ? !value
      : updateAction.result.data
      ? updateAction.result.data[field]
      : value;

  return (
    <div className="rounded-xl bg-muted p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold shrink-0">{label}</p>
        <div className="space-y-2">
          <Switch
            disabled={updateAction.status === "executing"}
            onCheckedChange={handleChange}
            checked={optimisticValue}
          >
            {value ? "On" : "Off"}
          </Switch>
        </div>
      </div>
    </div>
  );
};

export const ToggleCardSkeleton = () => {
  return <Skeleton className="rounded-xl h-[76px] w-full" />;
};
