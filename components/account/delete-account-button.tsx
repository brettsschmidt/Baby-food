"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccount } from "@/lib/actions/auth";

export function DeleteAccountButton() {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full text-destructive">
          <Trash2 className="h-4 w-4" /> Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your account, your household (if you&apos;re the only
            owner), and all data inside it. There&apos;s no undo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-delete">
            Type <strong>DELETE</strong> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || pending}
            onClick={() =>
              startTransition(async () => {
                await deleteAccount();
              })
            }
          >
            {pending ? "Deleting…" : "Delete forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
