"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintTrigger() {
  const [opened, setOpened] = useState(false);
  return (
    <div className="flex items-center justify-end gap-2 print:hidden">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (!opened) {
            setOpened(true);
            requestAnimationFrame(() => window.print());
          } else {
            window.print();
          }
        }}
      >
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </Button>
    </div>
  );
}
