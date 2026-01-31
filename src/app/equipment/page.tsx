"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  FlaskConical,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function EquipmentPage() {
  const [selectedLab, setSelectedLab] = useState<string>("physics");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<{
    id: string;
    name: string;
    total: number;
    unitType: "UNIT" | "ML";
    expirationDate: Date | null;
  } | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newTotal, setNewTotal] = useState(1);
  const [newUnitType, setNewUnitType] = useState<"UNIT" | "ML">("UNIT");
  const [newExpiration, setNewExpiration] = useState("");

  const { data: labData } = api.account.getLabId.useQuery(
    { lab: selectedLab },
    { enabled: !!selectedLab }
  );

  const { data: equipment, refetch } = api.account.getLabEquipment.useQuery(
    { labId: labData?.id ?? "" },
    { enabled: !!labData?.id }
  );

  const addMutation = api.account.addLabEquipment.useMutation();
  const updateMutation = api.account.updateLabEquipment.useMutation();
  const deleteMutation = api.account.deleteLabEquipment.useMutation();

  const handleAdd = () => {
    if (!labData?.id || !newName.trim()) return;

    addMutation.mutate(
      {
        labId: labData.id,
        name: newName.trim(),
        total: newTotal,
        unitType: newUnitType,
        expirationDate: newExpiration ? new Date(newExpiration) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Equipment added successfully");
          setIsAddDialogOpen(false);
          setNewName("");
          setNewTotal(1);
          setNewUnitType("UNIT");
          setNewExpiration("");
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingEquipment) return;

    updateMutation.mutate(
      {
        id: editingEquipment.id,
        name: editingEquipment.name,
        total: editingEquipment.total,
        unitType: editingEquipment.unitType,
        expirationDate: editingEquipment.expirationDate,
      },
      {
        onSuccess: () => {
          toast.success("Equipment updated successfully");
          setEditingEquipment(null);
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Equipment deleted successfully");
          refetch();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const getExpirationStatus = (date: Date | null) => {
    if (!date) return null;
    const daysUntil = differenceInDays(new Date(date), new Date());

    if (daysUntil < 0) {
      return { label: "Expired", color: "destructive" as const };
    } else if (daysUntil <= 7) {
      return { label: `${daysUntil}d left`, color: "secondary" as const };
    } else if (daysUntil <= 30) {
      return { label: `${daysUntil}d left`, color: "outline" as const };
    }
    return null;
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-3xl">Equipment Management</h1>
          <p className="mt-1 text-muted-foreground">
            Manage lab equipment inventory and availability
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
              <DialogDescription>
                Add equipment to the {selectedLab} lab
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Equipment Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Microscope, Bunsen Burner"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit-type">Unit Type</Label>
                  <Select value={newUnitType} onValueChange={(value) => setNewUnitType(value as "UNIT" | "ML")}>
                    <SelectTrigger id="unit-type">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNIT">Quantity</SelectItem>
                      <SelectItem value="ML">Milliliters (mL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total">Total Amount</Label>
                  <Input
                    id="total"
                    type="number"
                    min={1}
                    value={newTotal}
                    onChange={(e) => setNewTotal(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration Date (Optional)</Label>
                <Input
                  id="expiration"
                  type="date"
                  value={newExpiration}
                  onChange={(e) => setNewExpiration(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!newName.trim()}>
                Add Equipment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Label htmlFor="lab-select">Select Lab</Label>
        <Select value={selectedLab} onValueChange={setSelectedLab}>
          <SelectTrigger className="mt-2 w-48">
            <SelectValue placeholder="Select a lab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="physics">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                Physics/Chemistry
              </span>
            </SelectItem>
            <SelectItem value="biology">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                Biology
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {!equipment || equipment.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-medium text-lg">No equipment found</h3>
              <p className="mt-1 text-muted-foreground">
                Add equipment to this lab to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="stagger-children grid gap-4 sm:grid-cols-2">
            {equipment.map((item) => {
              const expirationStatus = getExpirationStatus(
                item.expirationDate ? new Date(item.expirationDate) : null
              );

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="h-4 w-4" />
                          {item.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Total: {item.total} {item.unitType === "ML" ? "mL" : "qty"}
                        </CardDescription>
                      </div>
                      {expirationStatus && (
                        <Badge variant={expirationStatus.color}>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {expirationStatus.label}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {item.expirationDate && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          Expires: {format(new Date(item.expirationDate), "PP")}
                        </div>
                      )}
                      <div className="ml-auto flex gap-2">
                        <Dialog
                          open={editingEquipment?.id === item.id}
                          onOpenChange={(open) =>
                            setEditingEquipment(
                              open
                                ? {
                                    id: item.id,
                                    name: item.name,
                                    total: item.total,
                                    unitType: item.unitType,
                                    expirationDate: item.expirationDate
                                      ? new Date(item.expirationDate)
                                      : null,
                                  }
                                : null
                            )
                          }
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Equipment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Equipment Name</Label>
                                <Input
                                  id="edit-name"
                                  value={editingEquipment?.name ?? ""}
                                  onChange={(e) =>
                                    setEditingEquipment((prev) =>
                                      prev ? { ...prev, name: e.target.value } : null
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-unit">Unit Type</Label>
                                <Select
                                  value={editingEquipment?.unitType ?? "UNIT"}
                                  onValueChange={(value) =>
                                    setEditingEquipment((prev) =>
                                      prev
                                        ? { ...prev, unitType: value as "UNIT" | "ML" }
                                        : null
                                    )
                                  }
                                >
                                  <SelectTrigger id="edit-unit">
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UNIT">Quantity</SelectItem>
                                    <SelectItem value="ML">Milliliters (mL)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-total">Total Amount</Label>
                                <Input
                                  id="edit-total"
                                  type="number"
                                  min={1}
                                  value={editingEquipment?.total ?? 1}
                                  onChange={(e) =>
                                    setEditingEquipment((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            total: parseInt(e.target.value) || 1,
                                          }
                                        : null
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-expiration">
                                  Expiration Date
                                </Label>
                                <Input
                                  id="edit-expiration"
                                  type="date"
                                  value={
                                    editingEquipment?.expirationDate
                                      ? format(
                                          editingEquipment.expirationDate,
                                          "yyyy-MM-dd"
                                        )
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setEditingEquipment((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            expirationDate: e.target.value
                                              ? new Date(e.target.value)
                                              : null,
                                          }
                                        : null
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setEditingEquipment(null)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleUpdate}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Equipment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{item.name}"? This
                                will also remove it from all sessions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
