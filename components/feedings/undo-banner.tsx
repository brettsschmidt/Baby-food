"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";

import { deleteFeeding } from "@/lib/actions/feedings";
import { Button } from "@/components/ui/button";

export function UndoBanner({ feedingId }: { feedingId: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 30_000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const onUndo = async () => {
    const fd = new FormData();
    fd.set("id", feedingId);
    await deleteFeeding(fd);
    setVisible(false);
    toast.success("Feeding undone");
    router.replace("/feedings");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      <span>Logged.</span>
      <Button size="sm" variant="ghost" onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
        Undo
      </Button>
    </div>
  );
}
