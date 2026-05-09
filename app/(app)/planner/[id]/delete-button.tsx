"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deletePrepPlan } from "@/lib/actions/planner";

export function DeletePrepPlanButton({ id }: { id: string }) {
  async function onConfirm() {
    const fd = new FormData();
    fd.set("id", id);
    await deletePrepPlan(fd);
  }

  return (
    <ConfirmButton
      title="Delete this prep session?"
      description="It'll be removed from your planner. Inventory you've already produced isn't affected."
      confirmLabel="Delete"
      onConfirm={onConfirm}
      trigger={
        <Button variant="outline" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      }
    />
  );
}
