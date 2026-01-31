"use client";
import React, { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Search, Trash2, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Roles = () => {
  const { data: accounts, refetch } = api.account.getAccounts.useQuery();
  const updateAccountMutation = api.account.updateAccountDetails.useMutation();
  const deleteAccountMutation = api.account.deleteAccount.useMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
  } | null>(null);

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    const query = searchQuery.toLowerCase();
    return accounts.filter((account) => {
      const fullName = `${account.firstName} ${account.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.role.toLowerCase().includes(query)
      );
    });
  }, [accounts, searchQuery]);

  const handleSave = () => {
    if (!selectedAccount) return;
    updateAccountMutation.mutate(
      {
        id: selectedAccount.id,
        firstName: selectedAccount.firstName.trim(),
        lastName: selectedAccount.lastName.trim(),
        role: selectedAccount.role,
      },
      {
        onSuccess: () => {
          toast.success("Account updated");
          setSelectedAccount(null);
          refetch();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteAccountMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Account deleted");
          refetch();
        },
        onError: () => toast.error("Error deleting account"),
      }
    );
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="font-semibold text-3xl">Roles & Permissions</h1>
        <p className="mt-1 text-muted-foreground">
          Rename accounts, update roles, and manage access levels
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          <Users className="mr-1 h-3 w-3" />
          {filteredAccounts.length} accounts
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>
            Click edit to rename or change roles. Changes apply immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.firstName} {account.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.email}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        account.role === "ADMIN"
                          ? "default"
                          : account.role === "TEACHER"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {account.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog
                        open={selectedAccount?.id === account.id}
                        onOpenChange={(open) =>
                          setSelectedAccount(
                            open
                              ? {
                                  id: account.id,
                                  firstName: account.firstName,
                                  lastName: account.lastName,
                                  role: account.role,
                                }
                              : null
                          )
                        }
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Account</DialogTitle>
                            <DialogDescription>
                              Update the user name and role.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="First name"
                                value={selectedAccount?.firstName ?? ""}
                                onChange={(e) =>
                                  setSelectedAccount((prev) =>
                                    prev
                                      ? { ...prev, firstName: e.target.value }
                                      : prev
                                  )
                                }
                              />
                              <Input
                                placeholder="Last name"
                                value={selectedAccount?.lastName ?? ""}
                                onChange={(e) =>
                                  setSelectedAccount((prev) =>
                                    prev
                                      ? { ...prev, lastName: e.target.value }
                                      : prev
                                  )
                                }
                              />
                            </div>
                            <Select
                              value={selectedAccount?.role}
                              onValueChange={(value) =>
                                setSelectedAccount((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        role: value as "ADMIN" | "TEACHER" | "STUDENT",
                                      }
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                                <SelectItem value="TEACHER">TEACHER</SelectItem>
                                <SelectItem value="STUDENT">STUDENT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleSave}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete account?</DialogTitle>
                            <DialogDescription>
                              This removes the user and all associated bookings permanently.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(account.id)}
                            >
                              Delete Account
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Roles;
