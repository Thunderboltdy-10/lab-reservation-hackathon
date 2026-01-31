"use client";
import { api } from "@/trpc/react";
import React, { useState } from "react";
import RoleEntry from "../_components/role";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Save, X } from "lucide-react";

const Roles = () => {
  const { data: accounts } = api.account.getAccounts.useQuery();
  const updateAccountsMutation = api.account.updateAccounts.useMutation();

  const [changedIds, setChangedIds] = useState<
    { id: string; role: "ADMIN" | "TEACHER" | "STUDENT" }[]
  >([]);

  const updateAccounts = () => {
    updateAccountsMutation.mutate(
      { accounts: changedIds },
      {
        onSuccess: () => {
          toast.success(
            `Account${changedIds.length > 1 ? "s" : ""} successfully updated`
          );
          setChangedIds([]);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <div className="container mx-auto flex h-screen max-w-4xl flex-col items-center justify-center gap-5 p-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="font-bold text-2xl">User Roles</h1>
      </div>
      <p className="text-muted-foreground">
        Manage user roles and permissions
      </p>

      <Card className="w-full overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-center font-semibold">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div className="w-10"></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {accounts?.map((account, i) => (
            <RoleEntry
              account={account}
              key={i}
              changedIds={changedIds}
              setChangedIds={setChangedIds}
            />
          ))}
        </CardContent>
      </Card>

      {changedIds.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={updateAccounts}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
          <Button variant="secondary" onClick={() => setChangedIds([])}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default Roles;
