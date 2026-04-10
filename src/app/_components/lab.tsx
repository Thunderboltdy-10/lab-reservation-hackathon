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
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useLab from "@/hooks/use-lab";
import { equipmentAtom, isBookingAtom } from "@/lib/atoms";
import { api } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";
import { type EquipmentUnit } from "@prisma/client";
import { useAtom } from "jotai";
import {
	Check,
	MinusIcon,
	PencilIcon,
	PlusIcon,
	Settings,
	Trash2,
	X,
    Search,
} from "lucide-react";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { useTheme } from "next-themes";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import SeatConfigSlider from "./SeatConfigSlider";
import SeatGrid, { type LabConfig, parseLabConfig } from "./SeatGrid";
import CalendarPicker from "./calendarPicker";

const getErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
};

const Lab = ({
	isPhysics,
	isTeacher,
}: { isPhysics: boolean; isTeacher: boolean }) => {
	const [booking, setBooking] = useAtom(isBookingAtom);
	const [equipment, setEquipment] = useAtom(equipmentAtom);
	const [sessionEquipmentDraft, setSessionEquipmentDraft] = useState<
		{
			name: string;
			id: string;
			total: number;
			available: number;
			unitType: EquipmentUnit;
		}[]
	>([]);
	const [bookingEquipmentDraft, setBookingEquipmentDraft] = useState<
		{
			name: string;
			id: string;
			total: number;
			available: number;
			unitType: EquipmentUnit;
		}[]
	>([]);

	const [labEquipmentSearch, setLabEquipmentSearch] = useState("");
	const [labEqVisibleCount, setLabEqVisibleCount] = useState(15);
	const [sessionEqSearch, setSessionEqSearch] = useState("");
	const [sessionEqVisibleCount, setSessionEqVisibleCount] = useState(15);
	const [bookingEqSearch, setBookingEqSearch] = useState("");
	const [bookingEqVisibleCount, setBookingEqVisibleCount] = useState(15);

	// Lab inventory add/edit dialog state
	const [labAddOpen, setLabAddOpen] = useState(false);
	const [labEditItem, setLabEditItem] = useState<{
		id: string;
		name: string;
		total: number;
		unitType: EquipmentUnit;
		category: string;
		casNumber: string;
		brand: string;
		location: string;
		expirationDate: Date | null;
	} | null>(null);
	const [templateName, setTemplateName] = useState("");
	const [templateTotal, setTemplateTotal] = useState(1);
	const [templateUnitType, setTemplateUnitType] = useState<EquipmentUnit>("UNIT");
	const [templateCategory, setTemplateCategory] = useState("");
	const [templateBrand, setTemplateBrand] = useState("");
	const [templateCasNumber, setTemplateCasNumber] = useState("");
	const [templateLocation, setTemplateLocation] = useState("");
	const [templateExpiration, setTemplateExpiration] = useState("");

	// Dynamic Seating State
	const [configVisible, setConfigVisible] = useState(false);
	const [notes, setNotes] = useState("");
	const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
	const [pendingSeat, setPendingSeat] = useState<string | null>(null);
	const [leftPanelWidth, setLeftPanelWidth] = useState(60);
	// Removed isEditing - unification of view/edit modes

	// Smart Save State
	const [initialNotes, setInitialNotes] = useState("");
	const [initialBookingEquipment, setInitialBookingEquipment] = useState<
		{ id: string; amount: number }[]
	>([]);
	const [currentTime, setCurrentTime] = useState(Date.now());
	const prevSessionRef = useRef<string | null>(null);
	const bookingDirtyRef = useRef(false);

	const utils = api.useUtils();

	const { userId } = useAuth();
	const { theme } = useTheme();
	const labData = useLab({ lab: isPhysics ? "Physics" : "Biology" });

	const bookSeatMutation = api.account.bookSeatWithEquipment.useMutation();
	const unbookSeatMutation = api.account.unbookSeat.useMutation();
	const switchSeatMutation = api.account.switchSeat.useMutation();
	const addLabEquipmentMutation = api.account.addLabEquipment.useMutation();
	const deleteLabEquipmentMutation =
		api.account.deleteLabEquipment.useMutation();
	const updateLabEquipmentMutation =
		api.account.updateLabEquipment.useMutation();
	const updateLabConfigMutation = api.account.updateLabConfig.useMutation();
	const updateSessionEquipmentMutation =
		api.account.updateSessionEquipment.useMutation();
	const updateBookingDetailsMutation =
		api.account.updateBookingDetails.useMutation();

    const { data: categories, refetch: refetchCategories } = api.account.getEquipmentCategories.useQuery();
    const { data: brandOptions, refetch: refetchBrands } = api.account.getEquipmentBrands.useQuery();
    const createCategoryMutation = api.account.createEquipmentCategory.useMutation({
        onSuccess: () => {
            toast.success("Category created");
            refetchCategories();
            refetchLabEquipment();
        },
    });
    const deleteCategoryMutation = api.account.deleteEquipmentCategory.useMutation({
        onSuccess: () => {
            toast.success("Category deleted");
            refetchCategories();
            refetchLabEquipment();
        },
    });
    const createBrandMutation = api.account.createEquipmentBrand.useMutation({
        onSuccess: () => {
            toast.success("Brand created");
            refetchBrands();
        },
    });
    const deleteBrandMutation = api.account.deleteEquipmentBrand.useMutation({
        onSuccess: () => {
            toast.success("Brand deleted");
            refetchBrands();
            refetchLabEquipment();
        },
    });
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<{id: string, name: string, equipmentCount?: number} | null>(null);
    const [brandToDelete, setBrandToDelete] = useState<{name: string, equipmentCount?: number} | null>(null);

	const config = useMemo(
		() => parseLabConfig(labData?.defaultRowConfig),
		[labData?.defaultRowConfig],
	);
	const activeSessionId = booking ?? equipment;
	const hasConfig = Boolean(labData?.defaultRowConfig);

	const { data: seats } = api.account.getSeatIds.useQuery(
		{
			labId: labData?.id ?? "",
		},
		{
			enabled: !!labData?.id,
		},
	);
	const seatIds = seats ?? [];

	const unitLabel = (unitType: EquipmentUnit) => {
		switch (unitType) {
			case "ML": return "mL";
			case "G": return "g";
			case "MG": return "mg";
			case "L": return "L";
			case "BOX": return "boxes";
			case "TABLETS": return "tabs";
			default: return "qty";
		}
	};

	const effectiveConfig = useMemo<LabConfig>(() => {
		if (hasConfig) return config;
		if (!seatIds.length) return config;

		const maxByRow = new Map<string, number>();
		for (const seat of seatIds) {
			if (seat.name.toLowerCase() === "edge") continue;
			const match = seat.name.match(/^([A-Za-z]+)(\d+)$/);
			if (!match) continue;
			const rowName = match[1]?.toUpperCase();
			const col = Number(match[2]);
			if (!rowName || Number.isNaN(col)) continue;
			const existing = maxByRow.get(rowName) ?? 0;
			if (col > existing) maxByRow.set(rowName, col);
		}

		const rows = Array.from(maxByRow.entries())
			.map(([name, seats]) => ({ name, seats }))
			.sort((a, b) => a.name.localeCompare(b.name));

		return {
			rows: rows.length > 0 ? rows : config.rows,
			edgeSeat: config.edgeSeat,
		};
	}, [config, seatIds, hasConfig]);

	const { data: occupiedSeats, refetch: refetchSeats } =
		api.account.getOccupiedSeats.useQuery(
			{
				labId: labData?.id ?? "",
				sessionId: activeSessionId ?? "",
			},
			{
				enabled: activeSessionId !== null && !!labData?.id,
			},
		);

	const myBooking = useMemo(
		() => occupiedSeats?.find((s) => s.userId === userId),
		[occupiedSeats, userId],
	);

	const { data: sessionData } = api.account.getSessionById.useQuery(
		{ sessionId: booking ?? "" },
		{
			enabled: !!booking,
		},
	);

	// Reactive Lockout Timer
	useEffect(() => {
		const interval = setInterval(() => setCurrentTime(Date.now()), 30000); // Update every 30s
		return () => clearInterval(interval);
	}, []);

	const isLate = useMemo(() => {
		if (!sessionData?.startAt) return false;
		const start = new Date(sessionData.startAt);
		const lockTime = new Date(start.getTime() - 15 * 60 * 1000);
		return currentTime > lockTime.getTime();
	}, [sessionData, currentTime]);

	const { data: labEquipment, refetch: refetchLabEquipment } =
		api.account.getLabEquipment.useQuery(
			{
				labId: labData?.id ?? "",
			},
			{
				enabled: !!labData?.id,
			},
		);

	const { data: sessionEquipment, refetch: refetchSessionEquipment } =
		api.account.getSessionEquipment.useQuery(
			{
				sessionId: activeSessionId ?? "",
			},
			{
				enabled: activeSessionId !== null,
			},
		);

	const bookSeat = async (name: string) => {
		if (!booking || !labData) return false;

		const selectedEquipment = bookingEquipmentDraft
			.filter((e) => e.available > 0)
			.map((e) => ({
				equipmentId: e.id,
				amount: e.available,
			}));

		try {
			await bookSeatMutation.mutateAsync({
				sessionId: booking,
				name,
				labId: labData.id,
				equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
				notes: notes?.trim() ? notes.trim() : undefined,
			});
			toast.success(`Seat ${name} successfully booked`);
			refetchSeats();
			utils.account.getMyBookings.invalidate();
			setBooking(null);
			return true;
		} catch (error: unknown) {
			const message = getErrorMessage(error, "Unable to book seat").includes(
				"Unique constraint",
			)
				? "You already have a booking for this session. Cancel it before booking another seat."
				: getErrorMessage(error, "Unable to book seat");
			toast.error(message);
			return false;
		}
	};

	const unbookSeat = (name: string) => {
		if (!booking || !labData) return;

		unbookSeatMutation.mutate(
			{
				sessionId: booking,
				name,
				labId: labData.id,
				isTeacher,
			},
			{
				onSuccess: () => {
					toast.success(`Seat ${name} successfully unbooked`);
					// Do NOT clear booking (session ID) here, otherwise we exit the session view!
					refetchSeats();
					utils.account.getMyBookings.invalidate();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const switchSeat = async (name: string) => {
		if (!booking || !labData || !myBooking) return false;

		try {
			await switchSeatMutation.mutateAsync({
				sessionId: booking,
				labId: labData.id,
				newSeatName: name,
			});
			toast.success(`Switched to seat ${name}`);
			refetchSeats();
			utils.account.getMyBookings.invalidate();
			return true;
		} catch (error: unknown) {
			toast.error(getErrorMessage(error, "Unable to switch seats"));
			return false;
		}
	};

	const addLabEquipment = () => {
		if (!labData?.id) {
			toast.error("Lab data is still loading");
			return;
		}

		if (templateName === "") {
			toast.error("Please enter a name for the equipment");
			return;
		}

		addLabEquipmentMutation.mutate(
			{
				name: templateName,
				labId: labData.id,
				total: templateTotal,
				unitType: templateUnitType,
				categoryId: templateCategory || undefined,
				brand: templateBrand.trim() || undefined,
				casNumber: templateCasNumber.trim() || undefined,
				location: templateLocation.trim() || undefined,
				expirationDate: templateExpiration ? new Date(templateExpiration) : undefined,
			},
			{
				onSuccess: () => {
					toast.success(`${templateName} successfully added`);
					setLabAddOpen(false);
					resetAddLabTemplate();
					refetchLabEquipment();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const resetAddLabTemplate = () => {
		setTemplateName("");
		setTemplateTotal(1);
		setTemplateUnitType("UNIT");
		setTemplateCategory("");
		setTemplateBrand("");
		setTemplateCasNumber("");
		setTemplateLocation("");
		setTemplateExpiration("");
	};

	const deleteLabEquipment = (id: string) => {
		deleteLabEquipmentMutation.mutate(
			{
				id,
			},
			{
				onSuccess: () => {
					toast.success("Equipment successfully deleted");
					refetchLabEquipment();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const handleEditLabEquipmentSave = () => {
		if (!labEditItem) return;
		updateLabEquipmentMutation.mutate(
			{
				id: labEditItem.id,
				name: labEditItem.name,
				total: labEditItem.total,
				unitType: labEditItem.unitType,
				categoryId: categories?.find(c => c.name === labEditItem.category)?.id || undefined,
				brand: labEditItem.brand.trim() || undefined,
				casNumber: labEditItem.casNumber.trim() || undefined,
				location: labEditItem.location.trim() || undefined,
				expirationDate: labEditItem.expirationDate,
			},
			{
				onSuccess: () => {
					toast.success("Equipment updated");
					setLabEditItem(null);
					refetchLabEquipment();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const updateSessionEquipment = () => {
		if (!equipment) return;

		const deletedEq =
			sessionEquipment?.filter(
				(eq) => !sessionEquipmentDraft.some((e) => e.id === eq.equipmentId),
			) ?? [];

		const addedEq = sessionEquipmentDraft.filter(
			(eq) => !sessionEquipment?.some((e) => e.equipmentId === eq.id),
		);

		const updatedEq = sessionEquipmentDraft.filter((eq) => {
			const e = sessionEquipment?.find((q) => q.equipmentId === eq.id);
			return e && e.available !== eq.available;
		});

		updateSessionEquipmentMutation.mutate(
			{
				sessionId: equipment,
				deletedEq: deletedEq.map((e) => {
					return {
						id: e.equipmentId,
						available: e.available,
					};
				}),
				addedEq: addedEq.map((e) => {
					return {
						id: e.id,
						available: e.available,
					};
				}),
				updatedEq: updatedEq.map((e) => {
					return {
						id: e.id,
						available: e.available,
					};
				}),
			},
			{
				onSuccess: () => {
					toast.success("Session equipment successfully updated");
					refetchSessionEquipment();
					utils.account.getSessionEquipment.invalidate({
						sessionId: equipment,
					});
					setEquipment(null);
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const addAllSessionEquipment = () => {
		if (!labEquipment || labEquipment.length === 0) return;
		setSessionEquipmentDraft(
			labEquipment.map((eq) => ({ ...eq, available: eq.total })),
		);
	};

	useEffect(() => {
		if (!activeSessionId) return;
		refetchSeats();
	}, [activeSessionId, refetchSeats]);

	useEffect(() => {
		return () => {
			setBooking(null);
			setEquipment(null);
		};
	}, [setBooking, setEquipment]);

	useEffect(() => {
		if (!activeSessionId) return;
		refetchSessionEquipment();
	}, [activeSessionId, refetchSessionEquipment]);

	// labEquipment from query is the source of truth - no local copy needed

	// State Sync Effect & Initial State (booking details only)
	const bookingInitRef = useRef<string | null>(null);

	useEffect(() => {
		if (!booking) return;

		if (!myBooking) {
			if (bookingInitRef.current) {
				setNotes("");
				setBookingEquipmentDraft([]);
				setInitialNotes("");
				setInitialBookingEquipment([]);
				bookingInitRef.current = null;
			}
			return;
		}

		const serverNotes = myBooking.notes ?? "";
		const bookings = myBooking.equipmentBookings;

		if (bookings.length > 0 && (!labEquipment || labEquipment.length === 0)) {
			return;
		}

		const serverEquipment = bookings
			.map((eb) => {
				const info = labEquipment?.find((e) => e.id === eb.equipmentId);
				return info ? { ...info, available: eb.amount } : null;
			})
			.filter(Boolean) as typeof bookingEquipmentDraft;

		const serverInitial = bookings.map((eb) => ({
			id: eb.equipmentId,
			amount: eb.amount,
		}));
		const bookingId = myBooking.id;

		if (bookingInitRef.current !== bookingId) {
			setInitialNotes(serverNotes);
			setNotes(serverNotes);
			setInitialBookingEquipment(serverInitial);
			setBookingEquipmentDraft(serverEquipment);
			bookingInitRef.current = bookingId;
			return;
		}

		if (!bookingDirtyRef.current) {
			setNotes(serverNotes);
			setBookingEquipmentDraft(serverEquipment);
		}
		setInitialNotes(serverNotes);
		setInitialBookingEquipment(serverInitial);
	}, [booking, myBooking, labEquipment]);

	// Derived State for Displayed Equipment (Available for selection)
	const displayedSessionEquipment = useMemo(() => {
		if (!booking || !sessionEquipment) return [];

		return sessionEquipment.map((eq) => {
			const limit = eq.available;
			const totalReserved = eq.reserved;
			const myInitial =
				initialBookingEquipment.find((ie) => ie.id === eq.equipmentId)
					?.amount || 0;
			const myCurrent =
				bookingEquipmentDraft.find((ae) => ae.id === eq.equipmentId)
					?.available || 0;

			const othersReserved = Math.max(totalReserved - myInitial, 0);
			const remaining = Math.max(limit - othersReserved - myCurrent, 0);

			return {
				name: eq.equipment.name,
				id: eq.equipmentId,
				total: eq.equipment.total,
				available: remaining,
				unitType: eq.equipment.unitType,
			};
		});
	}, [
		booking,
		sessionEquipment,
		bookingEquipmentDraft,
		initialBookingEquipment,
	]);

	// Teacher Mode Initialization
	const sessionDraftSessionRef = useRef<string | null>(null);

	useEffect(() => {
		if (!equipment) {
			sessionDraftSessionRef.current = null;
			return;
		}
		if (!sessionEquipment) return;

		const mapped = sessionEquipment.map((eq) => ({
			name: eq.equipment.name,
			id: eq.equipmentId,
			total: eq.equipment.total,
			available: eq.available,
			unitType: eq.equipment.unitType,
		}));

		if (sessionDraftSessionRef.current !== equipment) {
			setSessionEquipmentDraft(mapped);
			sessionDraftSessionRef.current = equipment;
		}
	}, [equipment, sessionEquipment]);

	useEffect(() => {
		if (activeSessionId !== prevSessionRef.current) {
			setSelectedSeat(null);
			setPendingSeat(null);
			setLabAddOpen(false);
			setLabEditItem(null);
			setNotes("");
			// setBookingEquipmentDraft([]) - Managed by init effect
			// setSessionEquipmentDraft([]) - Managed by init effect

			setInitialNotes("");
			setInitialBookingEquipment([]);
			prevSessionRef.current = activeSessionId ?? null;
		}
	}, [activeSessionId]);

	const handleSaveChanges = () => {
		// Find my booking ID
		if (!myBooking) return;

		updateBookingDetailsMutation.mutate(
			{
				bookingId: myBooking.id,
				notes: notes?.trim() ? notes.trim() : undefined,
				equipment: bookingEquipmentDraft
					.filter((e) => e.available > 0)
					.map((e) => ({ equipmentId: e.id, amount: e.available })),
			},
			{
				onSuccess: () => {
					toast.success("Booking details updated");
					refetchSeats();
					utils.account.getMyBookings.invalidate();
					setInitialNotes(notes);
					setInitialBookingEquipment(
						bookingEquipmentDraft.map((e) => ({
							id: e.id,
							amount: e.available,
						})),
					);
					setBooking(null);
				},
				onError: (err) => toast.error(err.message),
			},
		);
	};

	const isDirty = useMemo(() => {
		if (notes !== initialNotes) return true;

		if (bookingEquipmentDraft.length !== initialBookingEquipment.length)
			return true;

		for (const item of bookingEquipmentDraft) {
			const init = initialBookingEquipment.find((eq) => eq.id === item.id);
			if (!init || init.amount !== item.available) return true;
		}
		return false;
	}, [notes, initialNotes, bookingEquipmentDraft, initialBookingEquipment]);

	useEffect(() => {
		bookingDirtyRef.current = isDirty;
	}, [isDirty]);

	const hasSessionEquipmentChanges = useMemo(() => {
		if (!equipment || !sessionEquipment) return false;
		const currentMap = new Map(
			sessionEquipment.map((eq) => [eq.equipmentId, eq.available]),
		);
		for (const eq of sessionEquipmentDraft) {
			const existing = currentMap.get(eq.id);
			if (existing === undefined || existing !== eq.available) return true;
		}
		for (const existing of sessionEquipment) {
			if (!sessionEquipmentDraft.some((eq) => eq.id === existing.equipmentId))
				return true;
		}
		return false;
	}, [equipment, sessionEquipment, sessionEquipmentDraft]);

	const existingCategories = useMemo(() => {
		if (!labEquipment) return [];
		return Array.from(new Set(labEquipment.map(e => e.category?.name || 'General').filter(Boolean))).sort() as string[];
	}, [labEquipment]);

	const existingBrands = useMemo(() => {
		if (!labEquipment) return [];
		return Array.from(new Set(labEquipment.map(e => e.brand).filter(Boolean))).sort() as string[];
	}, [labEquipment]);

	const filteredLabEquipment = useMemo(() => {
		const search = labEquipmentSearch.trim().toLowerCase();
		return (labEquipment ?? [])
			.filter((item) => item.name.toLowerCase().includes(search))
			.slice(0, labEqVisibleCount);
	}, [labEquipment, labEquipmentSearch, labEqVisibleCount]);

	const filteredSessionLabEquipment = useMemo(() => {
		const search = sessionEqSearch.trim().toLowerCase();
		return (labEquipment ?? [])
			.filter((item) => item.name.toLowerCase().includes(search))
			.slice(0, sessionEqVisibleCount);
	}, [labEquipment, sessionEqSearch, sessionEqVisibleCount]);

	const reservedById = useMemo(() => {
		return new Map(
			(sessionEquipment ?? []).map((eq) => [eq.equipmentId, eq.reserved]),
		);
	}, [sessionEquipment]);

	const selectionActive = activeSessionId !== null;
	const showEquipmentPanel =
		isTeacher || booking !== null || equipment !== null;
	const seatControlsEnabled =
		booking !== null && equipment === null && !configVisible;
	const isEquipmentFocus =
		booking !== null ||
		equipment !== null ||
		labAddOpen ||
		pendingSeat !== null;

	// Equipment panel should shrink FIRST, blueprint should maintain minimum width
	const blueprintMinWidth = "520px";

	return (
		<div className="container mx-auto w-full max-w-[1600px] p-4 md:p-6 pb-12">
			<div className="mb-6 md:mb-8">
				<h1 className="font-semibold text-2xl md:text-3xl">
					{isPhysics ? "Physics & Chemistry Lab" : "Biology & Life Sciences Lab"}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm md:text-base">
					Manage seat reservations and equipment requests for upcoming sessions.
				</p>
			</div>
			<div className={`flex flex-col lg:flex-row w-full items-stretch gap-4 lg:gap-8 transition-all duration-500`}>
				{/* Blueprint / Seat Grid Panel - gets 2x share, minimum width */}
				<div
					className={`relative flex flex-col items-center justify-center rounded-[2rem] border bg-gradient-to-br from-card/80 via-card/50 to-muted/30 p-4 md:p-6 md:py-8 shadow-sm transition-all duration-500 ease-in-out ${booking !== null ? "border-transparent outline-blue shadow-lg" : "border-border/50"}`}
					style={{
						minWidth: showEquipmentPanel ? blueprintMinWidth : "100%",
						flex: showEquipmentPanel ? "2 1 520px" : "1 1 100%",
					}}
				>
						{isLate && !isTeacher && booking && (
							<div className="-translate-x-1/2 fade-in slide-in-from-top-4 absolute top-4 left-1/2 z-10 flex animate-in items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-4 py-2 font-medium text-destructive text-sm">
								<span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
								Bookings Locked
							</div>
						)}
						<SeatGrid
							config={effectiveConfig}
							occupiedSeats={
								occupiedSeats?.map((s) => ({
									id: s.seatId,
									name: s.name,
									userId: s.userId,
									status: s.status,
									user: s.user,
								})) ?? []
							}
							currentUserId={userId}
							onSeatClick={(seatName, isOccupied, isUserSeat) => {
								if (!seatControlsEnabled) {
									if (equipment) {
										toast.error("Switch to booking mode to manage seats");
									} else if (!booking) {
										toast.error("Select a session first to manage seats");
									}
									return;
								}
								if (!booking && !isTeacher && !configVisible) {
									toast.error("Please select a session first");
									return;
								}
								if (isLate && !isTeacher) {
									toast.error(
										"Bookings are locked 15 minutes before the session starts.",
									);
									return;
								}
								if (isOccupied && !isUserSeat && !isTeacher) {
									toast.error("This seat is occupied");
									return;
								}
								if (isOccupied) {
									setSelectedSeat(seatName);
								} else {
									setPendingSeat(seatName);
								}
							}}
							disabled={!seatControlsEnabled}
							screenSide={
								labData?.name?.toLowerCase().includes("biology")
									? "right"
									: "left"
							}
							showLegend={booking !== null}
							selectionActive={selectionActive}
							showCapacity={booking !== null}
						/>

						{isTeacher && (
							<div className="absolute top-4 right-4 z-20">
								<Button
									variant="secondary"
									size="icon"
									onClick={() => setConfigVisible(true)}
									title="Configure Layout"
									disabled={booking !== null || equipment !== null}
								>
									<Settings className="h-4 w-4" />
								</Button>
							</div>
						)}

						<Dialog
							open={!!selectedSeat}
							onOpenChange={(open) => !open && setSelectedSeat(null)}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										{occupiedSeats?.some(
											(s) => s.name === selectedSeat && s.userId === userId,
										)
											? "Manage Booking"
											: occupiedSeats?.some((s) => s.name === selectedSeat)
												? "Manage Seat"
												: "Confirm Booking"}
									</DialogTitle>
								</DialogHeader>
								<div className="py-4">
									<p className="mb-4 text-center">
										{occupiedSeats?.some(
											(s) => s.name === selectedSeat && s.userId === userId,
										)
											? `Are you sure you want to unbook seat ${selectedSeat}?`
											: occupiedSeats?.some((s) => s.name === selectedSeat)
												? `Unbook seat ${selectedSeat} for ${occupiedSeats.find((s) => s.name === selectedSeat)?.user.firstName}?`
												: `Do you want to book seat ${selectedSeat}?`}
									</p>
									<div className="flex justify-center gap-2">
										{occupiedSeats?.some((s) => s.name === selectedSeat) ? (
											<Button
												variant="destructive"
												onClick={() => {
													if (selectedSeat) unbookSeat(selectedSeat);
													setSelectedSeat(null);
												}}
											>
												Unbook Seat
											</Button>
										) : (
											<Button
												onClick={async () => {
													if (!selectedSeat) return;
													const success = await bookSeat(selectedSeat);
													if (success) setSelectedSeat(null);
												}}
											>
												Confirm Booking
											</Button>
										)}
										<Button
											variant="secondary"
											onClick={() => setSelectedSeat(null)}
										>
											Cancel
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>

						<Dialog open={configVisible} onOpenChange={setConfigVisible}>
							<DialogContent className="max-w-xl">
								<DialogHeader>
									<DialogTitle className="sr-only">
										Configure seat layout
									</DialogTitle>
								</DialogHeader>
								<SeatConfigSlider
									initialConfig={config}
									screenSide={
										labData?.name?.toLowerCase().includes("biology")
											? "right"
											: "left"
									}
									onSave={(newConfig) => {
										if (labData) {
											updateLabConfigMutation.mutate(
												{
													labId: labData.id,
													config: JSON.stringify(newConfig),
												},
												{
													onSuccess: () => {
														toast.success("Configuration updated");
														setConfigVisible(false);
														utils.account.getLabId.invalidate();
													},
												},
											);
										}
									}}
									onCancel={() => setConfigVisible(false)}
								/>
							</DialogContent>
						</Dialog>
					</div>
					{showEquipmentPanel && (
						<div
							className={`flex relative flex-col gap-3 md:gap-4 rounded-[2rem] border bg-card/60 p-4 md:p-6 shadow-sm transition-all duration-500 ease-in-out ${equipment !== null ? "border-transparent outline-green shadow-lg" : booking !== null ? "border-transparent outline-blue shadow-lg" : "border-border/50"} max-h-[500px] md:max-h-[70vh] lg:max-h-[600px]`}
							style={{ flex: "1 1 300px", minWidth: "280px" }}
						>
							<div
								className={`flex items-center ${booking === null && equipment === null ? "justify-between" : "justify-center"}`}
							>
								<div
									className={`pl-2 font-semibold text-foreground text-lg ${booking === null && equipment === null ? "" : "pt-1"}`}
								>
									{booking
										? "Session Equipment"
										: equipment
											? "Edit Session Equipment"
											: "Lab Inventory"}
								</div>
								{booking === null && equipment === null && isTeacher && (
									<Button
										variant={theme === "dark" ? "default" : "secondary"}
										onClick={() => {
											resetAddLabTemplate();
											setLabAddOpen(true);
										}}
										size="sm"
										className="rounded-xl shadow-sm h-8"
									>
										+ Add
									</Button>
								)}
							</div>
							<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar" onScroll={(e) => {
					const target = e.target as HTMLDivElement;
					if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
					if (!booking && !equipment) setLabEqVisibleCount(p => p + 15);
					else if (equipment !== null && !booking) setSessionEqVisibleCount(p => p + 15);
					else if (booking !== null) setBookingEqVisibleCount(p => p + 15);
					}
					}}>
								{isTeacher && !booking && !equipment && labEquipment && labEquipment.length > 0 && (
									<div className="relative w-full mb-1">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
										<Input 
											placeholder="Search..." 
											className="w-full pl-8 h-8 text-xs rounded-lg bg-background/40"
											value={labEquipmentSearch}
											onChange={(e) => setLabEquipmentSearch(e.target.value)}
										/>
									</div>
								)}
									{isTeacher && !booking && !equipment && (
										labEquipment === undefined ? (
											<div className="text-center py-4 text-muted-foreground text-xs italic">
												Loading lab inventory...
											</div>
										) : filteredLabEquipment.length === 0 ? (
											<div className="text-center py-4 text-muted-foreground text-xs italic">
												No matching equipment
											</div>
										) : (
											filteredLabEquipment.map((item) => (
												<div
													key={item.id}
													className="group flex w-full items-center gap-2 rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5 hover:bg-muted/20 transition-colors"
												>
													<div className="flex-1 min-w-0">
														<span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
														{item.category && (
															<span className="text-[10px] text-muted-foreground">{item.category?.name}</span>
														)}
													</div>
													<span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
														{item.total} {unitLabel(item.unitType)}
													</span>
													<Button
														size="icon"
														variant="ghost"
														className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
														onClick={() =>
															setLabEditItem({
																id: item.id,
																name: item.name,
																total: item.total,
																unitType: item.unitType,
																category: item.category?.name ?? "",
																casNumber: item.casNumber ?? "",
																brand: item.brand ?? "",
																location: item.location ?? "",
																expirationDate: item.expirationDate
																	? new Date(item.expirationDate)
																	: null,
															})
														}
														title="Edit"
													>
														<PencilIcon className="h-3.5 w-3.5" />
													</Button>
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button
																size="icon"
																variant="ghost"
																className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
																title="Delete"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
																<AlertDialogDescription>
																	This will permanently remove this item. Equipment with session history cannot be deleted.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancel</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => deleteLabEquipment(item.id)}
																	className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																>
																	Delete
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</div>
											))
										)
									)}
								{equipment !== null && isTeacher && (
									<div className="space-y-4">
										<div className="rounded-xl border border-border/60 bg-muted/30 p-4">
											<div className="mb-3 font-medium text-sm">
												Session Equipment
											</div>
											{sessionEquipment === undefined && (
												<div className="text-muted-foreground text-sm italic">
													Loading session equipment...
												</div>
											)}
											{sessionEquipment !== undefined &&
												sessionEquipmentDraft.length === 0 && (
													<div className="text-muted-foreground text-sm italic">
														No equipment configured for this session yet
													</div>
												)}
											{sessionEquipmentDraft.length > 0 && (
												<div className="space-y-2">
													{sessionEquipmentDraft.map((item) => {
														const reserved = reservedById.get(item.id) ?? 0;
														return (
															<div
																key={item.id}
																className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 p-2 text-sm"
															>
																<span className="font-medium">{item.name}</span>
																<div className="flex items-center gap-2">
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="h-6 w-6"
																		onClick={() => {
																			if (item.available <= reserved) {
																				toast.error(
																					"Cannot go below reserved amount",
																				);
																				return;
																			}
																			if (
																				item.available <= 1 &&
																				reserved === 0
																			) {
																				setSessionEquipmentDraft((prev) =>
																					prev.filter(
																						(eq) => eq.id !== item.id,
																					),
																				);
																				return;
																			}
																			setSessionEquipmentDraft((prev) =>
																				prev.map((eq) =>
																					eq.id === item.id
																						? {
																								...eq,
																								available: Math.max(
																									eq.available - 1,
																									reserved,
																								),
																							}
																						: eq,
																				),
																			);
																		}}
																	>
																		<MinusIcon className="h-3 w-3" />
																	</Button>
																	<Input
																		className="h-6 w-12 border-none bg-transparent p-0 text-center text-xs focus-visible:ring-0"
																		value={item.available}
																		onChange={(e) => {
																			let val = Number.parseInt(e.target.value);
																			if (Number.isNaN(val)) val = 0;
																			if (val < reserved) val = reserved;
																			const cap = item.total;
																			if (val > cap) val = cap;

																			setSessionEquipmentDraft((prev) =>
																				prev.map((eq) =>
																					eq.id === item.id
																						? { ...eq, available: val }
																						: eq,
																				),
																			);
																		}}
																		onBlur={(e) => {
																			const val = Number.parseInt(
																				e.target.value,
																			);
																			if (Number.isNaN(val) || val < 1) {
																				if (reserved > 0) {
																					setSessionEquipmentDraft((prev) =>
																						prev.map((eq) =>
																							eq.id === item.id
																								? { ...eq, available: reserved }
																								: eq,
																						),
																					);
																					return;
																				}
																				if (val <= 0) {
																					setSessionEquipmentDraft((prev) =>
																						prev.filter(
																							(eq) => eq.id !== item.id,
																						),
																					);
																					return;
																				}
																			}
																		}}
																	/>
																	<span className="text-muted-foreground text-xs">
																		{unitLabel(item.unitType)}
																	</span>
																	{reserved > 0 && (
																		<span className="text-[10px] text-muted-foreground">
																			Reserved: {reserved}
																		</span>
																	)}
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="h-6 w-6"
																		onClick={() => {
																			const cap = item.total;
																			if (item.available >= cap) return;
																			setSessionEquipmentDraft((prev) =>
																				prev.map((eq) =>
																					eq.id === item.id
																						? {
																								...eq,
																								available: eq.available + 1,
																							}
																						: eq,
																				),
																			);
																		}}
																	>
																		<PlusIcon className="h-3 w-3" />
																	</Button>
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="h-6 w-6"
																		onClick={() => {
																			if (reserved > 0) {
																				toast.error(
																					"Cannot remove equipment with reservations",
																				);
																				return;
																			}
																			setSessionEquipmentDraft((prev) =>
																				prev.filter((eq) => eq.id !== item.id),
																			);
																		}}
																	>
																		<Trash2 className="h-3 w-3 text-destructive" />
																	</Button>
																</div>
															</div>
														);
													})}
												</div>
											)}
										</div>

										<div className="rounded-xl border border-border/40 bg-muted/20 p-4">
											<div className="mb-3 flex items-center justify-between">
												<div className="font-medium text-sm">
													Add Equipment to Session
												</div>
												<Button
													type="button"
													size="sm"
													variant="secondary"
													onClick={addAllSessionEquipment}
													disabled={!labEquipment || labEquipment.length === 0}
												>
													Add All
												</Button>
											</div>
                                            {labEquipment && labEquipment.length > 0 && (
                                                <div className="relative w-full mb-3">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Search equipment..." 
                                                        className="w-full pl-8 h-8 text-xs"
                                                        value={sessionEqSearch}
                                                        onChange={(e) => setSessionEqSearch(e.target.value)}
                                                    />
                                                </div>
                                            )}
											{labEquipment === undefined ? (
												<div className="py-4 text-center text-muted-foreground text-sm italic">Loading lab equipment...</div>
											) : labEquipment.length === 0 ? (
												<div className="text-muted-foreground text-sm italic">
													No lab equipment available to add
												</div>
											) : filteredSessionLabEquipment.length === 0 ? (
												<div className="text-muted-foreground text-sm italic">
													No matching equipment
												</div>
											) : (
												<div className="max-h-56 space-y-2 overflow-y-auto pr-2 custom-scrollbar" onScroll={(e) => {
	                                                    const target = e.target as HTMLDivElement;
	                                                    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
	                                                        setSessionEqVisibleCount(p => p + 15);
	                                                    }
	                                                }}>
														{filteredSessionLabEquipment.map((item) => {
																const draftEntry = sessionEquipmentDraft.find((eq) => eq.id === item.id);
																const allocated = draftEntry?.available ?? 0;
																const remaining = item.total - allocated;
															const isAdded = !!draftEntry;
															return (
																<div
																	key={item.id}
																	className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${isAdded ? "border-primary/20 bg-primary/5" : "border-border/20 bg-background/30"}`}
																>
																	<div className="flex-1 min-w-0">
																		<span className={`text-sm font-medium ${isAdded ? "text-foreground" : "text-muted-foreground"}`}>
																			{item.name}
																		</span>
																		{isAdded && (
																			<span className="ml-2 text-[10px] text-primary font-medium">
																				{allocated} {unitLabel(item.unitType)} allocated
																			</span>
																		)}
																	</div>
																	<div className="flex items-center gap-2 shrink-0">
																		<span className="text-xs text-muted-foreground">
																			{remaining} {unitLabel(item.unitType)} free
																		</span>
																		{!isAdded ? (
																			<Button
																				type="button"
																				size="icon"
																				variant="ghost"
																				className="h-6 w-6"
																				disabled={item.total === 0}
																				onClick={() => {
																					setSessionEquipmentDraft((prev) => [
																						...prev,
																						{ ...item, available: Math.min(1, item.total) },
																					]);
																				}}
																			>
																				<PlusIcon className="h-3 w-3" />
																			</Button>
																		) : (
																			<Button
																				type="button"
																				size="icon"
																				variant="ghost"
																				className="h-6 w-6 text-muted-foreground hover:text-destructive"
																				onClick={() => {
																					const reserved = reservedById.get(item.id) ?? 0;
																					if (reserved > 0) {
																						toast.error("Cannot remove: equipment already reserved by students");
																						return;
																					}
																					setSessionEquipmentDraft((prev) => prev.filter((eq) => eq.id !== item.id));
																				}}
																			>
																				<X className="h-3 w-3" />
																			</Button>
																		)}
																	</div>
																</div>
																);
															})}
													</div>
												)}
										</div>

										<Button
											className="w-full"
											variant={theme === "dark" ? "default" : "secondary"}
											onClick={updateSessionEquipment}
											disabled={
												sessionEquipment === undefined ||
												!hasSessionEquipmentChanges ||
												updateSessionEquipmentMutation.isPending
											}
										>
											{updateSessionEquipmentMutation.isPending
												? "Saving..."
												: "Save Session Equipment"}
										</Button>
									</div>
								)}

								{booking && equipment === null && (
									<div className="space-y-4">
										{(() => {
											if (myBooking) {
												// Unified View/Edit Mode
												return (
													<div className="space-y-4">
														<div className="mb-4 flex items-center justify-between">
															<div className="flex items-center gap-2 font-semibold text-lg">
																<span className="h-2 w-2 rounded-full bg-sky-500" />
																Your Seat: {myBooking.name}
															</div>
															<AlertDialog>
																<AlertDialogTrigger asChild>
																	<Button
																		variant="destructive"
																		size="sm"
																		disabled={isLate && !isTeacher}
																	>
																		Unbook
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Cancel booking?
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			This will release seat {myBooking.name}{" "}
																			and remove any reserved equipment.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Keep Booking
																		</AlertDialogCancel>
																		<AlertDialogAction
																			onClick={() => unbookSeat(myBooking.name)}
																			className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																		>
																			Cancel Booking
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>

														{/* Notes Section */}
														<div className="mb-6 space-y-2">
															<div className="flex items-center gap-2">
																<label
																	htmlFor="teacher-notes"
																	className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
																>
																	Notes for Teacher
																</label>
																{notes !== initialNotes && (
																	<span className="font-medium text-[10px] text-amber-500">
																		Modified
																	</span>
																)}
															</div>
															<Textarea
																id="teacher-notes"
																placeholder="Enter notes for the teacher..."
																value={notes}
																onChange={(e) => setNotes(e.target.value)}
																className="h-24 resize-none bg-background/50 text-sm focus-visible:ring-1 focus-visible:ring-primary/30"
																disabled={isLate && !isTeacher}
															/>
														</div>

														{/* Booking Details / Equipment */}
														<div className="mb-6 space-y-2">
															<div className="mb-2 flex items-center gap-2 border-border/40 border-b pb-1">
																<div className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
																	Booking Details
																</div>
															</div>
															<div className="space-y-2">
																{bookingEquipmentDraft.length > 0 ? (
																	bookingEquipmentDraft.map((item) => (
																		<div
																			key={item.id}
																			className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 p-2 text-sm"
																		>
																			<span className="font-medium">
																				{item.name}
																			</span>
																			<div className="flex items-center gap-2">
																				<Button
																					type="button"
																					size="icon"
																					variant="ghost"
																					className="h-6 w-6"
																					onClick={() => {
																						if (item.available < 1) return;
																						if (item.available === 1) {
																							setBookingEquipmentDraft((prev) =>
																								prev.filter(
																									(eq) => eq.id !== item.id,
																								),
																							);
																						} else {
																							setBookingEquipmentDraft((prev) =>
																								prev.map((eq) =>
																									eq.id === item.id
																										? {
																												...eq,
																												available:
																													eq.available - 1,
																											}
																										: eq,
																								),
																							);
																						}
																					}}
																					disabled={isLate && !isTeacher}
																				>
																					<MinusIcon className="h-3 w-3" />
																				</Button>
																				<Input
																					className="h-6 w-12 border-none bg-transparent p-0 text-center text-xs focus-visible:ring-0"
																					value={item.available}
																					onChange={(e) => {
																						let val = Number.parseInt(
																							e.target.value,
																						);
																						if (Number.isNaN(val)) val = 0;
																						if (val < 0) val = 0;
																						// Check global availability cap from displayedSessionEquipment + current holdings
																						const globalItem =
																							displayedSessionEquipment.find(
																								(eq) => eq.id === item.id,
																							);
																						const currentHolding =
																							item.available;
																						const totalPool =
																							(globalItem?.available ?? 0) +
																							currentHolding;

																						if (val > totalPool)
																							val = totalPool;

																						setBookingEquipmentDraft((prev) =>
																							prev.map((eq) =>
																								eq.id === item.id
																									? { ...eq, available: val }
																									: eq,
																							),
																						);

																						// Update global available count inverse to local holding
																						const delta = val - currentHolding;
																					}}
																					onBlur={(e) => {
																						const val = Number.parseInt(
																							e.target.value,
																						);
																						if (Number.isNaN(val) || val <= 0) {
																							// Remove item if 0
																							const currentHolding =
																								item.available;

																							setBookingEquipmentDraft((prev) =>
																								prev.filter(
																									(eq) => eq.id !== item.id,
																								),
																							);
																						}
																					}}
																				/>
																				<span className="text-muted-foreground text-xs">
																					{unitLabel(item.unitType)}
																				</span>
																				<Button
																					type="button"
																					size="icon"
																					variant="ghost"
																					className="h-6 w-6"
																					onClick={() => {
																						const globalItem =
																							displayedSessionEquipment.find(
																								(eq) => eq.id === item.id,
																							);
																						if (
																							!globalItem ||
																							globalItem.available < 1
																						)
																							return;

																						setBookingEquipmentDraft((prev) =>
																							prev.map((eq) =>
																								eq.id === item.id
																									? {
																											...eq,
																											available:
																												eq.available + 1,
																										}
																									: eq,
																							),
																						);
																					}}
																					disabled={
																						(isLate && !isTeacher) ||
																						!displayedSessionEquipment.find(
																							(eq) =>
																								eq.id === item.id &&
																								eq.available > 0,
																						)
																					}
																				>
																					<PlusIcon className="h-3 w-3" />
																				</Button>
																			</div>
																		</div>
																	))
																) : (
																	<div className="pl-2 text-muted-foreground text-sm italic">
																		No equipment selected
																	</div>
																)}
															</div>

															<div className="my-4 border-border/40 border-t" />

															<div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
																Add Equipment
															</div>
                                                            {displayedSessionEquipment && displayedSessionEquipment.length > 0 && (
                                                                <div className="relative w-full mb-3">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                                    <Input 
                                                                        placeholder="Search equipment..." 
                                                                        className="w-full pl-8 h-8 text-xs bg-background/50"
                                                                        value={bookingEqSearch}
                                                                        onChange={(e) => setBookingEqSearch(e.target.value)}
                                                                    />
                                                                </div>
                                                            )}
															<div className="max-h-40 space-y-2 overflow-y-auto pr-2 custom-scrollbar" onScroll={(e) => {
                                                                const target = e.target as HTMLDivElement;
                                                                if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                                                                    setBookingEqVisibleCount(p => p + 15);
                                                                }
                                                            }}>
																{displayedSessionEquipment
																	.filter((item) => item.available > 0 && item.name.toLowerCase().includes(bookingEqSearch.toLowerCase()))
                                                                    .slice(0, bookingEqVisibleCount)
																	.map((item) => (
																		<div
																			key={item.id}
																			className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/20 p-2 text-sm"
																		>
																			<span className="text-muted-foreground">
																				{item.name}
																			</span>
																			<div className="flex items-center gap-2">
																				<span className="mr-2 text-muted-foreground text-xs">
																					{item.available}{" "}
																					{unitLabel(item.unitType)} left
																				</span>
																				<Button
																					type="button"
																					size="icon"
																					variant="ghost"
																					className="h-6 w-6"
																					onClick={() => {
																						if (
																							bookingEquipmentDraft.find(
																								(eq) => eq.id === item.id,
																							)
																						) {
																							setBookingEquipmentDraft((prev) =>
																								prev.map((eq) =>
																									eq.id === item.id
																										? {
																												...eq,
																												available:
																													eq.available + 1,
																											}
																										: eq,
																								),
																							);
																						} else {
																							setBookingEquipmentDraft(
																								(prev) => [
																									...prev,
																									{ ...item, available: 1 },
																								],
																							);
																						}
																					}}
																					disabled={isLate && !isTeacher}
																				>
																					<PlusIcon className="h-3 w-3" />
																				</Button>
																			</div>
																		</div>
																	))}
																{displayedSessionEquipment.filter(
																	(item) => item.available > 0,
																).length === 0 && (
																	<div className="pl-2 text-muted-foreground text-sm italic">
																		{sessionEquipment &&
																		sessionEquipment.length === 0
																			? "No equipment configured for this session"
																			: "No more equipment available"}
																	</div>
																)}
															</div>
														</div>

														{/* Smart Save Action */}
														<div
															className={`transition-all duration-300 ${isDirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
														>
															<Button
																className="group relative w-full overflow-hidden font-semibold"
																onClick={handleSaveChanges}
																disabled={isLate && !isTeacher}
															>
																<span className="relative z-10">
																	Save Changes
																</span>
																<div className="absolute inset-0 translate-y-full bg-primary/20 transition-transform duration-300 group-hover:translate-y-0" />
															</Button>
															<p className="mt-2 text-center text-[10px] text-muted-foreground">
																{isLate && !isTeacher
																	? "Modifications are locked"
																	: "Save changes to update notes or equipment"}
															</p>
														</div>
													</div>
												);
											}

											return null;
										})()}
									</div>
								)}
								{pendingSeat && (
									<div className="mb-4 rounded-xl border border-border/50 bg-muted/10 p-4">
										<div className="mb-2 text-center font-medium">
											Booking Seat: {pendingSeat}
										</div>
										{!myBooking && (
											<div className="space-y-2">
												<label
													htmlFor="pending-seat-notes"
													className="ml-1 font-medium text-xs"
												>
													Notes (Optional)
												</label>
												<Textarea
													id="pending-seat-notes"
													placeholder="Topic of study, specific requirements..."
													value={notes}
													onChange={(
														e: React.ChangeEvent<HTMLTextAreaElement>,
													) => setNotes(e.target.value)}
													className="h-20 resize-none bg-background/50 text-sm"
												/>
											</div>
										)}

										{!myBooking && (
											<div className="mt-4 space-y-4">
												<div className="rounded-lg border border-border/60 bg-muted/30 p-3">
													<div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
														Your Equipment Selection
													</div>
													{(bookingEquipmentDraft?.length ?? 0) > 0 ? (
														<div className="space-y-2">
															{bookingEquipmentDraft.map((item) => (
																<div
																	className="relative flex w-full select-none items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2 text-center"
																	key={item.id}
																>
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="h-7 w-7"
																		onClick={() => {
																			if (item.available < 1) return;
																			if (item.available === 1) {
																				setBookingEquipmentDraft((prev) =>
																					prev.filter(
																						(eq) => eq.id !== item.id,
																					),
																				);
																			} else {
																				setBookingEquipmentDraft((prev) =>
																					prev.map((eq) =>
																						eq.id === item.id
																							? {
																									...eq,
																									available: eq.available - 1,
																								}
																							: eq,
																					),
																				);
																			}
																		}}
																	>
																		<MinusIcon className="h-4 w-4" />
																	</Button>
																	<div className="flex-1 font-medium">
																		{item.name}
																	</div>
																	<Input
																		className="h-6 w-12 border-none bg-transparent p-0 text-center text-xs focus-visible:ring-0"
																		value={item.available}
																		onChange={(e) => {
																			let val = Number.parseInt(e.target.value);
																			if (Number.isNaN(val)) val = 0;
																			if (val < 0) val = 0;
																			const globalItem =
																				displayedSessionEquipment.find(
																					(eq) => eq.id === item.id,
																				);
																			const currentHolding = item.available;
																			// For pending seat (not booked yet), the displayedSessionEquipment has the pool.
																			// But displayedSessionEquipment available count usually subtracts what is selected?
																			// Yes, see the Plus icon logic:
																			// setDisplayedSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq))

																			const totalPool =
																				(globalItem?.available ?? 0) +
																				currentHolding;
																			if (val > totalPool) val = totalPool;

																			const delta = val - currentHolding;

																			setBookingEquipmentDraft((prev) =>
																				prev.map((eq) =>
																					eq.id === item.id
																						? { ...eq, available: val }
																						: eq,
																				),
																			);
																		}}
																		onBlur={(e) => {
																			const val = Number.parseInt(
																				e.target.value,
																			);
																			if (Number.isNaN(val) || val <= 0) {
																				const currentHolding = item.available;

																				setBookingEquipmentDraft((prev) =>
																					prev.filter(
																						(eq) => eq.id !== item.id,
																					),
																				);
																			}
																		}}
																	/>
																	<div className="text-muted-foreground text-sm text-xs">
																		{unitLabel(item.unitType)}
																	</div>
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="h-7 w-7"
																		onClick={() => {
																			const remaining =
																				displayedSessionEquipment.find(
																					(eq) => eq.id === item.id,
																				)?.available ?? 0;
																			if (remaining < 1) return;
																			setBookingEquipmentDraft((prev) =>
																				prev.map((eq) =>
																					eq.id === item.id
																						? {
																								...eq,
																								available: eq.available + 1,
																							}
																						: eq,
																				),
																			);
																		}}
																		disabled={
																			!displayedSessionEquipment.find(
																				(eq) =>
																					eq.id === item.id && eq.available > 0,
																			)
																		}
																	>
																		<PlusIcon className="h-4 w-4" />
																	</Button>
																</div>
															))}
														</div>
													) : (
														<div className="py-2 text-center text-muted-foreground text-sm">
															No equipment selected yet
														</div>
													)}
												</div>

												<div className="rounded-lg border border-border/40 bg-muted/20 p-3">
													<div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
														Available Equipment
													</div>
                                                    {displayedSessionEquipment && displayedSessionEquipment.some((item) => item.available > 0) && (
                                                        <div className="relative w-full mb-3">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                            <Input 
                                                                placeholder="Search equipment..." 
                                                                className="w-full pl-8 h-8 text-xs bg-background/50"
                                                                value={bookingEqSearch}
                                                                onChange={(e) => setBookingEqSearch(e.target.value)}
                                                            />
                                                        </div>
                                                    )}
													{displayedSessionEquipment.some(
														(item) => item.available > 0 && item.name.toLowerCase().includes(bookingEqSearch.toLowerCase()),
													) ? (
														<div className="max-h-48 space-y-2 overflow-y-auto custom-scrollbar" onScroll={(e) => {
                                                            const target = e.target as HTMLDivElement;
                                                            if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                                                                setBookingEqVisibleCount(p => p + 15);
                                                            }
                                                        }}>
															{displayedSessionEquipment
																.filter((item) => item.available > 0 && item.name.toLowerCase().includes(bookingEqSearch.toLowerCase()))
                                                                .slice(0, bookingEqVisibleCount)
																.map((item) => (
																	<div
																		className="relative flex w-full select-none items-center justify-between rounded-lg border border-border/40 bg-background/30 p-2 text-center"
																		key={item.id}
																	>
																		<Button
																			type="button"
																			size="icon"
																			variant="ghost"
																			className="h-7 w-7"
																			onClick={() => {
																				if (item.available < 1) return;
																				if (
																					bookingEquipmentDraft.find(
																						(eq) => eq.id === item.id,
																					)
																				) {
																					setBookingEquipmentDraft((prev) =>
																						prev.map((eq) =>
																							eq.id === item.id
																								? {
																										...eq,
																										available: eq.available + 1,
																									}
																								: eq,
																						),
																					);
																				} else {
																					setBookingEquipmentDraft((prev) => [
																						...prev,
																						{ ...item, available: 1 },
																					]);
																				}
																			}}
																		>
																			<PlusIcon className="h-4 w-4" />
																		</Button>
																		<div className="flex-1 text-muted-foreground">
																			{item.name}
																		</div>
																		<div className="min-w-[80px] text-center text-muted-foreground text-xs">
																			{item.available}{" "}
																			{unitLabel(item.unitType)} available
																		</div>
																	</div>
																))}
														</div>
													) : (
														<div className="py-2 text-center text-muted-foreground text-sm">
															{sessionEquipment && sessionEquipment.length === 0
																? "No equipment configured for this session"
																: "All equipment has been reserved"}
														</div>
													)}
												</div>
											</div>
										)}
										{myBooking && (
											<div className="mt-2 text-center text-muted-foreground text-xs">
												Notes and equipment stay the same when switching seats.
											</div>
										)}
										<div className="mt-4 flex gap-2">
											<Button
												className="flex-1"
												variant={theme === "dark" ? "default" : "secondary"}
												onClick={async () => {
													if (myBooking) {
														const success = await switchSeat(pendingSeat);
														if (!success) return;
														setPendingSeat(null);
														return;
													}
													const success = await bookSeat(pendingSeat);
													if (!success) return;
													setPendingSeat(null);
													setNotes("");
												}}
												disabled={
													(isLate && !isTeacher) ||
													switchSeatMutation.isPending ||
													bookSeatMutation.isPending
												}
											>
												{myBooking ? "Switch Seat" : "Confirm"}
											</Button>
											<Button
												variant="ghost"
												onClick={() => {
													setPendingSeat(null);
													if (!myBooking) setNotes("");
												}}
											>
												Cancel
											</Button>
										</div>
									</div>
								)}

								{!booking &&
									!pendingSeat &&
									equipment === null &&
									!isTeacher && (
										<div className="mb-4 rounded-lg border border-border/40 bg-muted/30 p-3 text-center text-muted-foreground text-sm">
											Select a session from the calendar to book a seat and
											equipment.
										</div>
									)}

								{booking !== null &&
									!myBooking &&
									!pendingSeat &&
									equipment === null &&
									!isTeacher && (
										<div className="space-y-3">
											<div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center text-muted-foreground text-sm">
												Select a seat on the grid to begin booking. Equipment selection comes next.
											</div>
											{sessionEquipment && sessionEquipment.length > 0 && (
												<div className="rounded-xl border border-border/30 bg-muted/10 p-3">
													<div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available Equipment</div>
													<div className="space-y-1.5">
														{sessionEquipment.map((eq) => {
															const free = Math.max(eq.available - eq.reserved, 0);
															return (
																<div key={eq.equipmentId} className="flex items-center justify-between rounded-lg px-2 py-1.5">
																	<span className="text-sm text-foreground">{eq.equipment.name}</span>
																	<span className="text-xs text-muted-foreground tabular-nums">
																		{free} / {eq.available} {unitLabel(eq.equipment.unitType)} free
																	</span>
																</div>
															);
														})}
													</div>
												</div>
											)}
										</div>
									)}
							</div>
						</div>
					)}
				</div>
			<div className="w-full mt-4 lg:mt-8">
				<CalendarPicker
					key={isPhysics ? "physics" : "biology"}
					lab={isPhysics ? "physics" : "biology"}
					isTeacher={isTeacher}
				/>
			</div>

		{/* Add Lab Equipment Dialog */}
		<Dialog open={labAddOpen} onOpenChange={(open) => { setLabAddOpen(open); if (!open) resetAddLabTemplate(); }}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Equipment to Lab</DialogTitle>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<div className="space-y-1.5">
						<label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
						<Input
							autoFocus
							placeholder="e.g., Sodium Hydroxide"
							value={templateName}
							onChange={(e) => setTemplateName(e.target.value)}
							className="rounded-xl"
							onKeyDown={(e) => { if (e.key === "Enter" && templateName.trim()) addLabEquipment(); }}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Category</label>
							<CreatableCombobox
								options={categories?.map(c => ({ value: c.id, label: c.name, equipmentCount: c.equipmentCount })) || []}
								value={templateCategory}
								onChange={(val) => setTemplateCategory(val)}
								onCreateOption={(val) => {
									setIsCreatingCategory(true);
									createCategoryMutation.mutate({ name: val }, {
										onSettled: () => setIsCreatingCategory(false),
										onSuccess: (data) => setTemplateCategory(data.id)
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
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Brand</label>
							<CreatableCombobox
								options={brandOptions?.map(b => ({ value: b.name, label: b.name, equipmentCount: b.equipmentCount })) || []}
								value={templateBrand}
								onChange={(val) => setTemplateBrand(val)}
								onCreateOption={(val) => {
									setIsCreatingBrand(true);
									createBrandMutation.mutate({ name: val }, {
										onSettled: () => setIsCreatingBrand(false),
										onSuccess: (data) => setTemplateBrand(data.name)
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
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Quantity <span className="text-destructive">*</span></label>
							<Input
								type="number"
								min={0}
								value={templateTotal}
								onChange={(e) => setTemplateTotal(Math.max(0, Number.parseInt(e.target.value) || 0))}
								className="rounded-xl"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Unit</label>
							<Select value={templateUnitType} onValueChange={(v) => setTemplateUnitType(v as EquipmentUnit)}>
								<SelectTrigger className="rounded-xl">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									<SelectItem value="UNIT">Quantity</SelectItem>
									<SelectItem value="ML">mL</SelectItem>
									<SelectItem value="G">g</SelectItem>
									<SelectItem value="MG">mg</SelectItem>
									<SelectItem value="L">L</SelectItem>
									<SelectItem value="BOX">Boxes</SelectItem>
									<SelectItem value="TABLETS">Tablets</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-1.5">
						<label className="text-sm font-medium">Location</label>
						<Input
							placeholder="e.g., Cabinet A / Shelf 2"
							value={templateLocation}
							onChange={(e) => setTemplateLocation(e.target.value)}
							className="rounded-xl"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">CAS Number</label>
							<Input
								placeholder="e.g., 1310-73-2"
								value={templateCasNumber}
								onChange={(e) => setTemplateCasNumber(e.target.value)}
								className="rounded-xl"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Expiry Date</label>
							<Input
								type="date"
								value={templateExpiration}
								onChange={(e) => setTemplateExpiration(e.target.value)}
								className="rounded-xl"
							/>
						</div>
					</div>
				</div>
				<div className="flex gap-2 justify-end pt-2">
					<Button variant="outline" className="rounded-xl" onClick={() => { setLabAddOpen(false); resetAddLabTemplate(); }}>Cancel</Button>
					<Button
						className="rounded-xl"
						disabled={!templateName.trim() || addLabEquipmentMutation.isPending}
						onClick={() => addLabEquipment()}
					>
						{addLabEquipmentMutation.isPending ? "Adding..." : "Add Item"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>

		{/* Edit Lab Equipment Dialog */}
		<Dialog open={!!labEditItem} onOpenChange={(open) => { if (!open) setLabEditItem(null); }}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Equipment</DialogTitle>
				</DialogHeader>
				{labEditItem && (
					<div className="space-y-3 py-2">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
							<Input
								autoFocus
								value={labEditItem.name}
								onChange={(e) => setLabEditItem({ ...labEditItem, name: e.target.value })}
								className="rounded-xl"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Category</label>
								<CreatableCombobox
									options={categories?.map(c => ({ value: c.id, label: c.name, equipmentCount: c.equipmentCount })) || []}
									value={categories?.find(c => c.name === labEditItem.category)?.id ?? ""}
									onChange={(val, label) => setLabEditItem({ ...labEditItem, category: label })}
									onCreateOption={(val) => {
										setIsCreatingCategory(true);
										createCategoryMutation.mutate({ name: val }, {
											onSettled: () => setIsCreatingCategory(false),
											onSuccess: (data) => setLabEditItem({ ...labEditItem, category: data.name })
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
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Brand</label>
								<CreatableCombobox
									options={brandOptions?.map(b => ({ value: b.name, label: b.name, equipmentCount: b.equipmentCount })) || []}
									value={labEditItem.brand}
									onChange={(val) => setLabEditItem({ ...labEditItem, brand: val })}
									onCreateOption={(val) => {
										setIsCreatingBrand(true);
										createBrandMutation.mutate({ name: val }, {
											onSettled: () => setIsCreatingBrand(false),
											onSuccess: (data) => setLabEditItem({ ...labEditItem, brand: data.name })
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
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Quantity</label>
								<Input
									type="number"
									min={0}
									value={labEditItem.total}
									onChange={(e) => setLabEditItem({ ...labEditItem, total: Math.max(0, Number.parseInt(e.target.value) || 0) })}
									className="rounded-xl"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Unit</label>
								<Select value={labEditItem.unitType} onValueChange={(v) => setLabEditItem({ ...labEditItem, unitType: v as EquipmentUnit })}>
									<SelectTrigger className="rounded-xl">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="UNIT">Quantity</SelectItem>
										<SelectItem value="ML">mL</SelectItem>
										<SelectItem value="G">g</SelectItem>
										<SelectItem value="MG">mg</SelectItem>
										<SelectItem value="L">L</SelectItem>
										<SelectItem value="BOX">Boxes</SelectItem>
										<SelectItem value="TABLETS">Tablets</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Location</label>
							<Input
								value={labEditItem.location}
								onChange={(e) => setLabEditItem({ ...labEditItem, location: e.target.value })}
								className="rounded-xl"
								placeholder="e.g., Cabinet A / Shelf 2"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-sm font-medium">CAS Number</label>
								<Input
									value={labEditItem.casNumber}
									onChange={(e) => setLabEditItem({ ...labEditItem, casNumber: e.target.value })}
									className="rounded-xl"
									placeholder="e.g., 1310-73-2"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Expiry Date</label>
								<Input
									type="date"
									value={labEditItem.expirationDate ? labEditItem.expirationDate.toISOString().split('T')[0] : ""}
									onChange={(e) => setLabEditItem({ ...labEditItem, expirationDate: e.target.value ? new Date(e.target.value) : null })}
									className="rounded-xl"
								/>
							</div>
						</div>
					</div>
				)}
				<div className="flex gap-2 justify-end pt-2">
					<Button variant="outline" className="rounded-xl" onClick={() => setLabEditItem(null)}>Cancel</Button>
					<Button
						className="rounded-xl"
						disabled={!labEditItem?.name.trim() || updateLabEquipmentMutation.isPending}
						onClick={handleEditLabEquipmentSave}
					>
						{updateLabEquipmentMutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
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
	);
};

export default Lab;
