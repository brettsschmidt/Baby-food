"use client";

import { useEffect } from "react";

import { addDays, formatISODate } from "@/lib/dates";

interface Props {
  freezerDays: number;
  fridgeDays: number;
  pantryDays: number;
}

export function ExpiryAutoFiller({ freezerDays, fridgeDays, pantryDays }: Props) {
  useEffect(() => {
    const select = document.querySelector<HTMLSelectElement>("[data-storage-select]");
    const input = document.querySelector<HTMLInputElement>("[data-expiry-input]");
    if (!select || !input) return;

    const map: Record<string, number> = {
      freezer: freezerDays,
      fridge: fridgeDays,
      pantry: pantryDays,
    };

    const fill = (force = false) => {
      // Only auto-fill when the field is blank or the user hasn't manually edited it.
      if (input.value && !force && input.dataset.autofilled !== "true") return;
      const days = map[select.value] ?? freezerDays;
      input.value = formatISODate(addDays(new Date(), days));
      input.dataset.autofilled = "true";
    };

    // Initial autofill if blank
    if (!input.value) fill(true);

    const onStorageChange = () => fill(true);
    const onUserEdit = () => {
      input.dataset.autofilled = "false";
    };

    select.addEventListener("change", onStorageChange);
    input.addEventListener("input", onUserEdit);
    return () => {
      select.removeEventListener("change", onStorageChange);
      input.removeEventListener("input", onUserEdit);
    };
  }, [freezerDays, fridgeDays, pantryDays]);

  return null;
}
