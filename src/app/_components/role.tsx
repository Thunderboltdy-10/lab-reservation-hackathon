"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type RouterOutputs } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";
import { PencilIcon, Trash2Icon } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const RoleEntry = ({
  account,
  changedIds,
  setChangedIds,
}: {
  account: RouterOutputs["account"]["getAccounts"][number];
  changedIds: { id: string; role: "ADMIN" | "TEACHER" | "STUDENT" }[];
  setChangedIds: React.Dispatch<
    React.SetStateAction<{ id: string; role: "ADMIN" | "TEACHER" | "STUDENT" }[]>
  >;
}) => {
  const { userId } = useAuth();
  const [role, setRole] = useState(account.role);

  const deleteAccountMutation = api.account.deleteAccount.useMutation();

  const changeRole = (val: "ADMIN" | "TEACHER" | "STUDENT") => {
    setRole(val);

    setChangedIds((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === account.id);

      if (val === account.role) {
        if (existingIndex !== -1)
          return prev.filter((item) => item.id !== account.id);
        else return prev;
      } else {
        if (existingIndex !== -1) {
          return prev.map((item, index) =>
            index === existingIndex ? { ...item, role: val } : item
          );
        } else {
          return [...prev, { id: account.id, role: val }];
        }
      }
    });
  };

  const deleteAccount = (id: string) => {
    deleteAccountMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Account successfully deleted");
        },
        onError: () => {
          toast.error("Error deleting account");
        },
      }
    );
  };

  useEffect(() => {
    if (changedIds.length === 0) setRole(account.role);
  }, [changedIds, account.role]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "TEACHER":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isChanged = changedIds.some((item) => item.id === account.id);

  return (
    <div
      className={`grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b p-3 text-center transition-colors hover:bg-muted/50 ${
        isChanged ? "bg-accent/20" : ""
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-foreground">
        {account.firstName} {account.lastName}
        {account.id === userId && (
          <Badge variant="outline" className="text-xs">
            You
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-center text-muted-foreground text-sm">
        {account.email}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Change role"
            className="flex cursor-pointer items-center justify-center gap-2 transition-colors"
          >
            <Badge variant={getRoleBadgeVariant(role)} className="min-w-20">
              {role}
            </Badge>
            <PencilIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={role}
            onValueChange={(val: string) =>
              changeRole(val as "ADMIN" | "TEACHER" | "STUDENT")
            }
          >
            <DropdownMenuRadioItem value="ADMIN" className="cursor-pointer">
              ADMIN
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="TEACHER" className="cursor-pointer">
              TEACHER
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="STUDENT" className="cursor-pointer">
              STUDENT
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Delete user"
            className="mx-2 h-5 w-5 cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2Icon className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader className="flex items-center text-center">
            <DialogTitle>
              Are you sure you want to permanently delete this account?
            </DialogTitle>
            <p className="mt-2 text-muted-foreground text-sm">
              This action cannot be undone. All bookings and data associated with{" "}
              {account.firstName} {account.lastName} will be deleted.
            </p>
            <div className="mt-5 flex w-full gap-2">
              <DialogClose className="flex-1" asChild>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => deleteAccount(account.id)}
                >
                  Delete Account
                </Button>
              </DialogClose>
              <DialogClose className="flex-1" asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleEntry;
