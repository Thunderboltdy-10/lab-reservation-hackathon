"use client";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { differenceInDays, format } from "date-fns";
import {
	AlertTriangle,
	Beaker,
	FlaskConical,
	Package,
	Pencil,
	Plus,
	Search,
	Trash2,
	Globe
} from "lucide-react";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import React, { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type UnitType = "UNIT" | "ML" | "G" | "MG" | "L" | "BOX" | "TABLETS";

const UNIT_OPTIONS: { label: string; value: UnitType }[] = [
	{ label: "Quantity (Unit)", value: "UNIT" },
	{ label: "Milliliters (mL)", value: "ML" },
	{ label: "Liters (L)", value: "L" },
	{ label: "Grams (g)", value: "G" },
	{ label: "Milligrams (mg)", value: "MG" },
	{ label: "Box", value: "BOX" },
	{ label: "Tablets", value: "TABLETS" },
];

export default function EquipmentPage() {
	const [selectedLab, setSelectedLab] = useState<string>("all");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("ALL");
    
	const [editingEquipment, setEditingEquipment] = useState<{
		id: string;
		name: string;
		total: number;
		unitType: UnitType;
		expirationDate: Date | null;
        category: string | { id: string; name: string } | null;
        casNumber: string;
	        brand: string;
	        location: string;
		} | null>(null);

	// Query labs to get IDs
	const { data: physicsLabData } = api.account.getLabId.useQuery({ lab: "physics" });
	const { data: biologyLabData } = api.account.getLabId.useQuery({ lab: "biology" });

	const physicsLabOption = useMemo(() => {
		if (!physicsLabData?.id) return null;
		return {
			id: physicsLabData.id,
			label: "Physics / Chemistry Lab",
			location: physicsLabData.name,
		};
	}, [physicsLabData]);

	const biologyLabOption = useMemo(() => {
		if (!biologyLabData?.id) return null;
		return {
			id: biologyLabData.id,
			label: "Biology Lab",
			location: biologyLabData.name,
		};
	}, [biologyLabData]);

	const labOptions = useMemo(() => {
		return [physicsLabOption, biologyLabOption].filter((option): option is NonNullable<typeof option> => Boolean(option));
	}, [physicsLabOption, biologyLabOption]);

	const activeLabOption = useMemo(() => {
		if (selectedLab === "physics" && physicsLabOption) return physicsLabOption;
		if (selectedLab === "biology" && biologyLabOption) return biologyLabOption;
		return physicsLabOption ?? biologyLabOption ?? null;
	}, [selectedLab, physicsLabOption, biologyLabOption]);

	const resolvedLabIds = useMemo(() => {
		return new Set(labOptions.map((option) => option.id));
	}, [labOptions]);

	// Form state
	const [newName, setNewName] = useState("");
	const [newTotal, setNewTotal] = useState(1);
	const [newUnitType, setNewUnitType] = useState<UnitType>("UNIT");
	const [newExpiration, setNewExpiration] = useState("");
    const [newCategory, setNewCategory] = useState("General Organic");
    const [newCasNumber, setNewCasNumber] = useState("");
    const [newBrand, setNewBrand] = useState("");
    const [newLocation, setNewLocation] = useState(activeLabOption?.location ?? "");
    const [addLabId, setAddLabId] = useState<string>(activeLabOption?.id ?? "");
    const [newCategoryId, setNewCategoryId] = useState<string>("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
    const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
    const [newBrandId, setNewBrandId] = useState<string>("");
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<{id: string, name: string, equipmentCount?: number} | null>(null);
    const [brandToDelete, setBrandToDelete] = useState<{name: string, equipmentCount?: number} | null>(null);

    const { data: categories, refetch: refetchCategories } = api.account.getEquipmentCategories.useQuery();
    const { data: brandOptions, refetch: refetchBrands } = api.account.getEquipmentBrands.useQuery();
    const createCategoryMutation = api.account.createEquipmentCategory.useMutation({
        onSuccess: (data) => {
            setNewCategoryId(data.id);
            toast.success("Category created");
            refetchCategories();
            refetch();
        },
    });
    const deleteCategoryMutation = api.account.deleteEquipmentCategory.useMutation({
        onSuccess: () => {
            toast.success("Category deleted");
            refetchCategories();
            refetch();
            setCategoryToDelete(null);
        },
    });
    const createBrandMutation = api.account.createEquipmentBrand.useMutation({
        onSuccess: (data) => {
            setNewBrand(data.name);
            toast.success("Brand created");
            refetchBrands();
        },
    });
    const deleteBrandMutation = api.account.deleteEquipmentBrand.useMutation({
        onSuccess: () => {
            toast.success("Brand deleted");
            refetchBrands();
            refetch();
            setBrandToDelete(null);
        },
    });
    
    // Pagination / Infinite scroll state
    const [visibleCount, setVisibleCount] = useState(20);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
                setVisibleCount(prev => prev + 20);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        setVisibleCount(20);
    }, [searchQuery, categoryFilter, selectedLab]);

	const { data: equipment, refetch } = api.account.getLabEquipment.useQuery(
		{ labId: selectedLab === "all" ? undefined : selectedLab === "physics" ? physicsLabData?.id : biologyLabData?.id },
		{ 
            enabled: true,
            staleTime: 60 * 60 * 1000,
            gcTime: 60 * 60 * 1000 
        }
	);

	const addMutation = api.account.addLabEquipment.useMutation();
	const updateMutation = api.account.updateLabEquipment.useMutation();
	const deleteMutation = api.account.deleteLabEquipment.useMutation();

	const addLabIdIsResolved = resolvedLabIds.has(addLabId);

	const handleAdd = () => {
		if (!newName.trim()) return;
		if (!addLabIdIsResolved) {
			toast.error("Select a valid lab before saving.");
			return;
		}

		addMutation.mutate(
			{
				labId: addLabId,
				name: newName.trim(),
				total: newTotal,
				unitType: newUnitType,
				expirationDate: newExpiration ? new Date(newExpiration) : undefined,
                categoryId: newCategoryId,
                casNumber: newCasNumber,
                brand: newBrand,
                location: newLocation,
			},
			{
				onSuccess: () => {
					toast.success("Equipment added successfully");
					setIsAddDialogOpen(false);
                    resetAddForm();
					refetch();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
			);
		};

    const resetAddForm = () => {
        setNewName("");
        setNewTotal(1);
        setNewUnitType("UNIT");
        setNewExpiration("");
        setNewCategory("General Organic");
        setNewCasNumber("");
        setNewBrand("");
        setNewLocation(activeLabOption?.location ?? "");
        setAddLabId(activeLabOption?.id ?? "");
    };

	useEffect(() => {
		if (!isAddDialogOpen || !activeLabOption) return;
		setAddLabId(activeLabOption.id);
		setNewLocation(activeLabOption.location);
	}, [activeLabOption, isAddDialogOpen]);

	const handleUpdate = () => {
		if (!editingEquipment) return;

		updateMutation.mutate(
			{
				id: editingEquipment.id,
				name: editingEquipment.name,
				total: editingEquipment.total,
				unitType: editingEquipment.unitType,
				expirationDate: editingEquipment.expirationDate,
                categoryId: (editingEquipment.category as { id: string } | null)?.id,
                casNumber: editingEquipment.casNumber,
                brand: editingEquipment.brand,
                location: editingEquipment.location,
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
			},
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
			},
		);
	};

	const getExpirationStatus = (date: Date | null) => {
		if (!date) return null;
		const daysUntil = differenceInDays(new Date(date), new Date());

		if (daysUntil < 0) {
			return { label: "Expired", color: "destructive" as const, urgent: true };
		}
		if (daysUntil <= 30) {
			return { label: `${daysUntil}d left`, color: "secondary" as const, urgent: daysUntil <= 7 };
		}
		return null;
	};

    const categoryFilterOptions = useMemo(() => {
        if (!equipment) return [];
        const cats = new Set(equipment.map(e => e.category?.name || 'General'));
        return Array.from(cats).sort();
    }, [equipment]);

    const brands = useMemo(() => {
        if (!equipment) return [];
        return Array.from(new Set(equipment.map(e => e.brand).filter(Boolean))).sort() as string[];
    }, [equipment]);

    const filteredEquipment = useMemo(() => {
        if (!equipment) return [];
        return equipment.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (item.casNumber && item.casNumber.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = categoryFilter === "ALL" || (item.category?.name || 'General') === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [equipment, searchQuery, categoryFilter]);

	return (
		<div className="container mx-auto max-w-7xl p-6 lg:p-12">
			<div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl tracking-tight">Equipment Inventory</h1>
					<p className="mt-2 text-muted-foreground">
						Manage and track all laboratory equipment and chemicals across facilities.
					</p>
				</div>
				<Dialog
					open={isAddDialogOpen}
					onOpenChange={(open) => {
						setIsAddDialogOpen(open);
						if (open) {
							setAddLabId(activeLabOption?.id ?? "");
							setNewLocation(activeLabOption?.location ?? "");
							return;
						}
						resetAddForm();
					}}
				>
					<DialogTrigger asChild>
						<Button className="rounded-xl shadow-sm">
							<Plus className="mr-2 h-4 w-4" />
							Add New Item
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[600px] rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-xl">Add New Equipment</DialogTitle>
							<DialogDescription>
								Fill out the details below to log a new item into the inventory system.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2 col-span-2">
									<Label htmlFor="target-lab">Target Lab</Label>
									<Select
										value={addLabId}
										onValueChange={setAddLabId}
										disabled={labOptions.length === 0}
									>
	                                    <SelectTrigger id="target-lab" className="rounded-xl">
	                                        <SelectValue placeholder="Select lab to assign to" />
	                                    </SelectTrigger>
	                                    <SelectContent className="rounded-xl">
	                                        {labOptions.length === 0 ? (
												<SelectItem value="loading-labs" disabled>
													Loading labs...
												</SelectItem>
											) : (
												labOptions.map((option) => (
													<SelectItem key={option.id} value={option.id}>
														{option.label}
													</SelectItem>
												))
											)}
	                                    </SelectContent>
	                                </Select>
								</div>

							<div className="space-y-2 col-span-2 md:col-span-1">
								<Label htmlFor="name">Item Name <span className="text-destructive">*</span></Label>
								<Input
									id="name"
                                    className="rounded-xl"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="e.g., Sodium Hydroxide"
								/>
							</div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
								<Label htmlFor="category">Category</Label>
								<CreatableCombobox
									options={categories?.map(c => ({ value: c.id, label: c.name, equipmentCount: c.equipmentCount })) || []}
									value={newCategoryId}
									onChange={(val) => setNewCategoryId(val)}
									onCreateOption={(val) => {
										setIsCreatingCategory(true);
										createCategoryMutation.mutate({ name: val }, {
											onSettled: () => setIsCreatingCategory(false)
										});
									}}
									onDeleteOption={(val, name, count) => {
										setCategoryToDelete({ id: val, name, equipmentCount: count });
									}}
									placeholder="Select category..."
									emptyText="No categories found."
									isCreating={isCreatingCategory}
								/>
							</div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
								<Label htmlFor="cas">CAS Number</Label>
								<Input
									id="cas"
                                    className="rounded-xl"
									value={newCasNumber}
									onChange={(e) => setNewCasNumber(e.target.value)}
									placeholder="e.g., 1310-73-2"
								/>
							</div>
	                            <div className="space-y-2 col-span-2 md:col-span-1">
									<Label htmlFor="brand">Brand</Label>
									<CreatableCombobox
										options={brandOptions?.map(b => ({ value: b.name, label: b.name, equipmentCount: b.equipmentCount })) || []}
										value={newBrand}
										onChange={(val) => setNewBrand(val)}
										onCreateOption={(val) => {
											setIsCreatingBrand(true);
											createBrandMutation.mutate({ name: val }, {
												onSettled: () => setIsCreatingBrand(false)
											});
										}}
										onDeleteOption={(val, name, count) => {
											setBrandToDelete({ name: val, equipmentCount: count });
										}}
										placeholder="Select brand..."
										emptyText="No brands found."
										isCreating={isCreatingBrand}
									/>
								</div>
	                            <div className="space-y-2 col-span-2 md:col-span-1">
									<Label htmlFor="location">Location</Label>
									<Input
										id="location"
	                                    className="rounded-xl"
										value={newLocation}
										onChange={(e) => setNewLocation(e.target.value)}
										placeholder="e.g., Cabinet A / Shelf 2"
									/>
								</div>

	                            <div className="space-y-2">
                                <Label htmlFor="unit-type">Unit Type <span className="text-destructive">*</span></Label>
                                <Select
                                    value={newUnitType}
                                    onValueChange={(value) =>
                                        setNewUnitType(value as UnitType)
                                    }
                                >
                                    <SelectTrigger id="unit-type" className="rounded-xl">
                                        <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {UNIT_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="total">Quantity <span className="text-destructive">*</span></Label>
	                                <Input
	                                    id="total"
	                                    type="number"
	                                    min={0}
	                                    step={1}
	                                    className="rounded-xl"
	                                    value={newTotal}
	                                    onChange={(e) =>
	                                        setNewTotal(Math.max(0, Number.parseInt(e.target.value, 10) || 0))
	                                    }
	                                />
                            </div>
							
							<div className="space-y-2 col-span-2">
								<Label htmlFor="expiration">Expiry Date</Label>
								<Input
									id="expiration"
									type="date"
                                    className="rounded-xl"
									value={newExpiration}
									onChange={(e) => setNewExpiration(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
                                className="rounded-xl"
								onClick={() => { setIsAddDialogOpen(false); resetAddForm(); }}
							>
								Cancel
							</Button>
								<Button
	                                onClick={handleAdd}
	                                disabled={!newName.trim() || !addLabIdIsResolved || addMutation.isPending}
	                                className="rounded-xl"
	                            >
									Save Item
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

                <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                    <AlertDialogContent className="rounded-2xl sm:max-w-[425px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Delete Category</AlertDialogTitle>
                            <AlertDialogDescription className="text-base pt-2">
                                Are you sure you want to permanently delete "{categoryToDelete?.name}"?
                                {categoryToDelete && categoryToDelete.equipmentCount !== undefined && categoryToDelete.equipmentCount > 0 && (
                                    <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                                        <strong>Warning:</strong> {categoryToDelete.equipmentCount} equipment {categoryToDelete.equipmentCount === 1 ? 'item' : 'items'} currently use this category. They will be set to have no category.
                                    </div>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (categoryToDelete) {
                                        deleteCategoryMutation.mutate({ id: categoryToDelete.id });
                                    }
                                }}
                                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Yes, delete it
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={!!brandToDelete} onOpenChange={(open) => !open && setBrandToDelete(null)}>
                    <AlertDialogContent className="rounded-2xl sm:max-w-[425px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Delete Brand</AlertDialogTitle>
                            <AlertDialogDescription className="text-base pt-2">
                                Are you sure you want to delete the brand "{brandToDelete?.name}"?
                                {brandToDelete && brandToDelete.equipmentCount !== undefined && brandToDelete.equipmentCount > 0 && (
                                    <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                                        <strong>Warning:</strong> {brandToDelete.equipmentCount} equipment {brandToDelete.equipmentCount === 1 ? 'item' : 'items'} currently use this brand. They will be set to have no brand.
                                    </div>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (brandToDelete) {
                                        deleteBrandMutation.mutate({ name: brandToDelete.name });
                                    }
                                }}
                                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Yes, delete it
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
			</div>

            {/* Filters Section */}
			<div className="mb-8 border-b border-border/50 pb-6">
                <div className="flex flex-col lg:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <Label htmlFor="lab-select" className="text-sm font-medium">Lab</Label>
                            <Select value={selectedLab} onValueChange={setSelectedLab}>
                                <SelectTrigger className="rounded-xl bg-background/50 h-11 shadow-sm border-transparent hover:border-border transition-colors">
                                    <SelectValue placeholder="Select Lab" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">
                                        <span className="flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            All Labs
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="physics">
                                        <span className="flex items-center gap-2">
                                            <Beaker className="h-4 w-4" />
                                            Physics/Chem Lab
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="biology">
                                        <span className="flex items-center gap-2">
                                            <FlaskConical className="h-4 w-4" />
                                            Biology Lab
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    <div className="flex-[2] space-y-2 w-full">
                        <Label htmlFor="search" className="text-sm font-medium">Search Inventory</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                id="search"
                                placeholder="Search by name, CAS number, brand..." 
                                className="rounded-xl bg-background/50 h-11 pl-10 shadow-sm border-transparent hover:border-border transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <Label htmlFor="category-select" className="text-sm font-medium">Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="rounded-xl bg-background/50 h-11 shadow-sm border-transparent hover:border-border transition-colors">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {categories?.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                                {categoryFilterOptions.filter(c => !categories?.some(db => db.name === c)).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
			</div>

            {/* Data Table Wrapper */}
			<div className="w-full overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/40 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground bg-muted/30 border-b border-border/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap">Item Details</th>
                                <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap">Category / CAS</th>
                                <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap">Lab</th>
                                <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap">Stock Level</th>
                                <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap">Expiry Date</th>
                                <th scope="col" className="px-6 py-4 font-medium whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {!filteredEquipment || filteredEquipment.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Package className="h-10 w-10 mb-4 opacity-50" />
                                            <p className="text-lg font-medium">No items found</p>
                                            <p className="text-sm opacity-80">Try adjusting your filters or adding new equipment.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEquipment.slice(0, visibleCount).map((item) => {
                                    const expStatus = getExpirationStatus(item.expirationDate ? new Date(item.expirationDate) : null);
                                    return (
                                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-foreground">{item.name}</div>
                                                {item.brand && (
                                                    <div className="text-xs text-muted-foreground mt-1">Brand: {item.brand}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-normal rounded-lg mb-1 whitespace-nowrap">
                                                    {item.category?.name || "General"}
                                                </Badge>
                                                {item.casNumber && (
                                                    <div className="text-xs text-muted-foreground mt-1.5 font-mono">CAS: {item.casNumber}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="text-sm font-medium">
                                                        {item.lab?.name || "Unknown Facility"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-base font-semibold">{item.total}</span>
                                                <span className="text-xs text-muted-foreground ml-1.5">{item.unitType}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.expirationDate ? (
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <span className="text-sm">{format(new Date(item.expirationDate), "MMM d, yyyy")}</span>
                                                        {expStatus && (
                                                            <Badge variant={expStatus.urgent ? "destructive" : "outline"} className="font-normal rounded-md text-[10px] px-1.5">
                                                                {expStatus.urgent && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                                                                {expStatus.label}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Dialog
                                                        open={editingEquipment?.id === item.id}
                                                        onOpenChange={(open) =>
                                                            setEditingEquipment(
                                                                open
                                                                    ? {
                                                                            id: item.id,
                                                                            name: item.name,
                                                                            total: item.total,
                                                                            unitType: item.unitType as UnitType,
                                                                            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                                                                            category: item.category || 'General',
                                                                            casNumber: item.casNumber || '',
                                                                            brand: item.brand || '',
                                                                            location: item.location || '',
                                                                        }
                                                                    : null,
                                                            )
                                                        }
                                                    >
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[600px] rounded-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-xl">Edit Item Details</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2 col-span-2 md:col-span-1">
                                                                    <Label htmlFor="edit-name">Item Name</Label>
                                                                    <Input
                                                                        id="edit-name"
                                                                        className="rounded-xl"
                                                                        value={editingEquipment?.name ?? ""}
                                                                        onChange={(e) =>
                                                                            setEditingEquipment((prev) => prev ? { ...prev, name: e.target.value } : null)
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="space-y-2 col-span-2 md:col-span-1">
                                                                    <Label htmlFor="edit-category">Category</Label>
                                                                    <CreatableCombobox
                                                                        options={categories?.map(c => ({ value: c.id, label: c.name, equipmentCount: c.equipmentCount })) || []}
                                                                        value={(editingEquipment?.category as { id: string })?.id ?? ""}
                                                                        onChange={(val, label) =>
                                                                            setEditingEquipment((prev) => prev ? { ...prev, category: { id: val, name: label } } : null)
                                                                        }
                                                                        onCreateOption={(val) => {
                                                                            setIsCreatingCategory(true);
                                                                            createCategoryMutation.mutate({ name: val }, {
                                                                                onSettled: () => setIsCreatingCategory(false),
                                                                                onSuccess: (data) => {
                                                                                    setEditingEquipment((prev) => prev ? { ...prev, category: { id: data.id, name: data.name } } : null);
                                                                                }
                                                                            });
                                                                        }}
                                                                        onDeleteOption={(val, name, count) => {
                                                                            setCategoryToDelete({ id: val, name, equipmentCount: count });
                                                                        }}
                                                                        placeholder="Select category..."
                                                                        emptyText="No categories found."
                                                                        isCreating={isCreatingCategory}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2 col-span-2 md:col-span-1">
                                                                    <Label htmlFor="edit-cas">CAS Number</Label>
                                                                    <Input
                                                                        id="edit-cas"
                                                                        className="rounded-xl"
                                                                        value={editingEquipment?.casNumber ?? ""}
                                                                        onChange={(e) =>
                                                                            setEditingEquipment((prev) => prev ? { ...prev, casNumber: e.target.value } : null)
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="space-y-2 col-span-2 md:col-span-1">
                                                                    <Label htmlFor="edit-brand">Brand</Label>
                                                                    <CreatableCombobox
                                                                        options={brandOptions?.map(b => ({ value: b.name, label: b.name, equipmentCount: b.equipmentCount })) || []}
                                                                        value={editingEquipment?.brand ?? ""}
                                                                        onChange={(val) =>
                                                                            setEditingEquipment((prev) => prev ? { ...prev, brand: val } : null)
                                                                        }
                                                                        onCreateOption={(val) => {
                                                                            setIsCreatingBrand(true);
                                                                            createBrandMutation.mutate({ name: val }, {
                                                                                onSettled: () => setIsCreatingBrand(false),
                                                                                onSuccess: (data) => {
                                                                                    setEditingEquipment((prev) => prev ? { ...prev, brand: data.name } : null);
                                                                                }
                                                                            });
                                                                        }}
                                                                        onDeleteOption={(val, name, count) => {
                                                                            setBrandToDelete({ name: val, equipmentCount: count });
                                                                        }}
                                                                        placeholder="Select brand..."
                                                                        emptyText="No brands found."
                                                                        isCreating={isCreatingBrand}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="edit-unit">Unit Type</Label>
                                                                    <Select
                                                                        value={editingEquipment?.unitType ?? "UNIT"}
                                                                        onValueChange={(value) =>
                                                                            setEditingEquipment((prev) => prev ? { ...prev, unitType: value as UnitType } : null)
                                                                        }
                                                                    >
                                                                        <SelectTrigger id="edit-unit" className="rounded-xl">
                                                                            <SelectValue placeholder="Select unit" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl">
                                                                            {UNIT_OPTIONS.map(opt => (
                                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="edit-total">Quantity</Label>
	                                                                    <Input
	                                                                        id="edit-total"
	                                                                        type="number"
	                                                                        min={0}
	                                                                        step={1}
	                                                                        className="rounded-xl"
	                                                                        value={editingEquipment?.total ?? 0}
	                                                                        onChange={(e) =>
	                                                                            setEditingEquipment((prev) => prev ? { ...prev, total: Math.max(0, Number.parseInt(e.target.value, 10) || 0) } : null)
	                                                                        }
	                                                                    />
                                                                </div>
                                                                <div className="space-y-2 col-span-2">
                                                                    <Label htmlFor="edit-expiration">Expiry Date</Label>
                                                                    <Input
                                                                        id="edit-expiration"
                                                                        type="date"
                                                                        className="rounded-xl"
                                                                        value={editingEquipment?.expirationDate ? format(editingEquipment.expirationDate, "yyyy-MM-dd") : ""}
                                                                        onChange={(e) =>
                                                                            setEditingEquipment((prev) => prev ? { ...prev, expirationDate: e.target.value ? new Date(e.target.value) : null } : null)
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setEditingEquipment(null)} className="rounded-xl">
                                                                    Cancel
                                                                </Button>
                                                                <Button onClick={handleUpdate} className="rounded-xl">
                                                                    Save Changes
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-2xl sm:max-w-[425px]">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-xl">Delete Item</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-base pt-2">
                                                                    Are you sure you want to permanently delete <span className="font-semibold text-foreground">"{item.name}"</span>? 
                                                                    This action cannot be undone and will remove it from all associated data.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="mt-4">
                                                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(item.id)}
                                                                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Yes, delete it
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
			</div>
		</div>
	);
}
