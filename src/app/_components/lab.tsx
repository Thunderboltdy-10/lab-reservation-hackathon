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
	const [displayedLabEquipment, setDisplayedLabEquipment] = useState<
		{ id: string; name: string; total: number; unitType: EquipmentUnit }[]
	>([]);
	const [editedLabEquipment, setEditedLabEquipment] = useState<
		{ id: string; name: string; total: number; unitType: EquipmentUnit }[]
	>([]);
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

	const [templateVisible, setTemplateVisible] = useState(false);
	const [templateName, setTemplateName] = useState("");
	const [templateTotal, setTemplateTotal] = useState(1);
	const [templateUnitType, setTemplateUnitType] = useState<EquipmentUnit>(
		"UNIT",
	);

	// Dynamic Seating State
	const [configVisible, setConfigVisible] = useState(false);
	const [notes, setNotes] = useState("");
	const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
	const [pendingSeat, setPendingSeat] = useState<string | null>(null);
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
			},
			{
				onSuccess: () => {
					toast.success(`${templateName} successfully added`);
					setTemplateVisible(false);
					setTemplateName("");
					setTemplateTotal(1);
					setTemplateUnitType("UNIT");
					refetchLabEquipment();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
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

	const updateLabEquipment = (id: string) => {
		const eq = editedLabEquipment.find((e) => e.id === id);
		if (!eq) return;

		updateLabEquipmentMutation.mutate(
			{
				id: eq.id,
				name: eq.name,
				total: eq.total,
				unitType: eq.unitType,
			},
			{
				onSuccess: () => {
					toast.success("Equipment successfully updated");
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

	useEffect(() => {
		if (!labEquipment) return;
		setDisplayedLabEquipment(
			labEquipment.map((e) => ({
				id: e.id,
				name: e.name,
				total: e.total,
				unitType: e.unitType,
			})),
		);
	}, [labEquipment]);

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
			setTemplateVisible(false);
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
		templateVisible ||
		pendingSeat !== null;
	const labPanelClass = showEquipmentPanel
		? isEquipmentFocus
			? "w-full lg:basis-[56%]"
			: "w-full lg:basis-[60%]"
		: "w-full lg:basis-full";
	const equipmentPanelClass = isEquipmentFocus ? "w-full lg:basis-[44%]" : "w-full lg:basis-[40%]";

	return (
		<div className="container mx-auto w-full max-w-[1600px] p-6 pb-12">
			<div className="mb-8">
				<h1 className="font-semibold text-3xl">
					{isPhysics ? "Physics & Chemistry Facility" : "Biology & Life Sciences"}
				</h1>
				<p className="mt-1 text-muted-foreground">
					Manage seat reservations and equipment requests for upcoming sessions.
				</p>
			</div>
			<div className="mx-auto flex flex-col lg:flex-row w-full items-stretch gap-8 transition-all duration-500 ease-spring">
					<div
						className={`relative flex ${labPanelClass} flex-col items-center justify-center rounded-[2rem] border bg-gradient-to-br from-card/80 via-card/50 to-muted/30 p-8 shadow-sm transition-[flex-basis] duration-500 ease-in-out ${activeSessionId !== null ? "border-transparent outline-blue shadow-lg" : "border-border/50"}`}
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
							className={`flex ${equipmentPanelClass} relative flex-col gap-4 rounded-[2rem] border border-border/50 bg-card/60 p-5 md:p-6 shadow-sm transition-[flex-basis] duration-500 ease-in-out ${booking !== null || equipment !== null ? "outline-blue shadow-lg" : ""} h-[500px] max-h-[70vh] lg:max-h-[600px]`}
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
										onClick={() => setTemplateVisible(true)}
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
								{templateVisible && !booking && !equipment && (
									<div className="w-full rounded-xl border border-border/60 bg-muted/40 p-3 text-foreground shadow-sm">
										<div className="flex flex-col gap-3">
											<Input
												type="text"
												className="bg-background/50 h-8 border-none text-xs focus-visible:ring-1 rounded-lg"
												placeholder="Item Name"
												autoFocus
												value={templateName}
												onChange={(e) => setTemplateName(e.target.value)}
											/>
					<div className="flex items-center gap-2">
					<Select
					value={templateUnitType}
					onValueChange={(value) =>
					setTemplateUnitType(value as EquipmentUnit)
					}
					>
					<SelectTrigger className="h-8 flex-1 text-[10px] rounded-lg bg-background/50 border-none">
					<SelectValue placeholder="Unit" />
					</SelectTrigger>
					<SelectContent className="rounded-xl">
					<SelectItem value="UNIT">Qty</SelectItem>
					<SelectItem value="ML">mL</SelectItem>
					<SelectItem value="G">g</SelectItem>
					<SelectItem value="MG">mg</SelectItem>
					<SelectItem value="L">L</SelectItem>
					<SelectItem value="BOX">boxes</SelectItem>
					<SelectItem value="TABLETS">tabs</SelectItem>
					</SelectContent>
					</Select>
					<Input
					type="number"
					className="bg-background/50 h-8 w-16 border-none text-center text-xs focus-visible:ring-1 rounded-lg"
					placeholder="Qty"
					value={templateTotal}
					onChange={(e) =>
					setTemplateTotal(
					Number.parseInt(e.target.value) > 1
					? Number.parseInt(e.target.value)
					: 1,
					)
					}
					/>
					</div>
											<div className="flex gap-2">
					<Button
					className="flex-1 h-8 text-xs rounded-lg"
					variant={theme === "dark" ? "default" : "secondary"}
					onClick={() => addLabEquipment()}
					>
					Add Item
					</Button>
					<Button
					size="icon"
					variant="ghost"
					className="h-8 w-8 rounded-lg"
					onClick={() => {
					setTemplateVisible(false);
					setTemplateName("");
					setTemplateTotal(1);
					setTemplateUnitType("UNIT");
					}}
					>
					<X className="h-3.5 w-3.5" />
					</Button>
					</div>
										</div>
									</div>
								)}

								{isTeacher &&
									!booking &&
									!equipment &&
									(labEquipment ? (
										labEquipment
					.filter(item => item.name.toLowerCase().includes(labEquipmentSearch.toLowerCase()))
					.slice(0, labEqVisibleCount)
					.map((item) => {
					const index = displayedLabEquipment.findIndex(e => e.id === item.id);
					if (index === -1) return null;
					const isChanged = displayedLabEquipment[index]?.total !== item.total || 
					displayedLabEquipment[index]?.name !== item.name || 
					displayedLabEquipment[index]?.unitType !== item.unitType;

					return (
											<div
												className={`w-full rounded-xl border transition-all duration-300 ${isChanged ? "border-blue/40 bg-blue/5" : "border-border/40 bg-muted/10 hover:bg-muted/20"} p-2 px-3 text-foreground group`}
												key={item.id}
											>
												<div className="flex items-center gap-2">
					<div className="relative flex-1 min-w-0">
					<Input
					type="text"
					id={item.id}
					className="!bg-transparent h-7 w-full border-none text-xs font-medium focus-visible:ring-0 p-0 overflow-hidden text-ellipsis whitespace-nowrap"
					placeholder="Item Name"
					value={displayedLabEquipment[index]?.name ?? ""}
					onChange={(e) => {
					const newName = e.target.value;
					setDisplayedLabEquipment((prev) =>
					prev.map((eq) =>
					eq.id === item.id
					? { ...eq, name: newName }
					: eq,
					),
					);
					setEditedLabEquipment((prev) => {
					const existing = prev.find(
					(eq) => eq.id === item.id,
					);
					if (existing)
					return prev.map((eq) =>
					eq.id === item.id
					? { ...eq, name: newName }
					: eq,
					);
					return [
					...prev,
					{
					id: item.id,
					name: newName,
					total: item.total,
					unitType: item.unitType,
					},
					];
					});
					}}
					/>
					{isChanged && (
					<div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-blue" title="Unsaved changes" />
					)}
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
					<Input
					type="number"
					className="!bg-background/30 h-6 w-11 border-none text-center text-[10px] focus-visible:ring-1 rounded-md"
					value={displayedLabEquipment[index]?.total ?? ""}
					onChange={(e) => {
					let newTotal = Number.parseInt(e.target.value);
					if (e.target.value === "") newTotal = 0;
					if (Number.isNaN(newTotal)) newTotal = 0;
					setDisplayedLabEquipment((prev) =>
					prev.map((eq) =>
					eq.id === item.id
					? { ...eq, total: newTotal }
					: eq,
					),
					);
					setEditedLabEquipment((prev) => {
					const existing = prev.find(
					(eq) => eq.id === item.id,
					);
					if (existing)
					return prev.map((eq) =>
					eq.id === item.id
					? { ...eq, total: newTotal }
					: eq,
					);
					return [
					...prev,
					{
					id: item.id,
					name: item.name,
					total: newTotal,
					unitType:
					displayedLabEquipment[index]
					?.unitType ?? item.unitType,
					},
					];
					});
					}}
					/>
					<Select
					value={
					displayedLabEquipment[index]?.unitType ??
					item.unitType
					}
					onValueChange={(value) => {
					const newUnit = value as EquipmentUnit;
					setDisplayedLabEquipment((prev) =>
					prev.map((eq) =>
					eq.id === item.id
					? { ...eq, unitType: newUnit }
					: eq,
					),
					);
					setEditedLabEquipment((prev) => {
					const existing = prev.find(
					(eq) => eq.id === item.id,
					);
					if (existing)
					return prev.map((eq) =>
					eq.id === item.id
					? { ...eq, unitType: newUnit }
					: eq,
					);
					return [
					...prev,
					{
					id: item.id,
					name: item.name,
					total: item.total,
					unitType: newUnit,
					},
					];
					});
					}}
					>
					<SelectTrigger className="h-6 w-14 text-[9px] uppercase font-bold border-none bg-background/30 rounded-md px-1.5">
					<SelectValue placeholder="Unit" />
					</SelectTrigger>
					<SelectContent className="rounded-xl">
					<SelectItem value="UNIT">Qty</SelectItem>
					<SelectItem value="ML">mL</SelectItem>
					<SelectItem value="G">g</SelectItem>
					<SelectItem value="MG">mg</SelectItem>
					<SelectItem value="L">L</SelectItem>
					<SelectItem value="BOX">boxes</SelectItem>
					<SelectItem value="TABLETS">tabs</SelectItem>
					</SelectContent>
					</Select>

					{isChanged ? (
					<Button
					size="icon"
					variant="default"
					className="h-6 w-6 rounded-md bg-blue hover:bg-blue/90 text-white animate-in fade-in zoom-in-95"
					onClick={() => updateLabEquipment(item.id)}
					title="Save Changes"
					>
					<Check className="h-3 w-3" />
					</Button>
					) : (
					<Button
					size="icon"
					variant="ghost"
					className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={() => deleteLabEquipment(item.id)}
					title="Delete"
					>
					<Trash2 className="h-3 w-3" />
					</Button>
					)}
					</div>
												</div>
											</div>
					);
										})
									) : (
										<div className="text-center py-4 text-muted-foreground text-xs italic">
											No items found
										</div>
									))}
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
											{labEquipment && labEquipment.length > 0 ? (
												<div className="max-h-56 space-y-2 overflow-y-auto pr-2 custom-scrollbar" onScroll={(e) => {
                                                    const target = e.target as HTMLDivElement;
                                                    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                                                        setSessionEqVisibleCount(p => p + 15);
                                                    }
                                                }}>
													{labEquipment
														.filter(
															(item) =>
																!sessionEquipmentDraft.some(
																	(eq) => eq.id === item.id,
																) && item.name.toLowerCase().includes(sessionEqSearch.toLowerCase()),
														)
                                                        .slice(0, sessionEqVisibleCount)
														.map((item) => (
															<div
																key={item.id}
																className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 p-2 text-sm"
															>
																<span className="text-muted-foreground">
																	{item.name}
																</span>
																<div className="flex items-center gap-2">
																	<span className="mr-2 text-muted-foreground text-xs">
																		{item.total} {unitLabel(item.unitType)}
																	</span>
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="h-6 w-6"
																		onClick={() => {
																			setSessionEquipmentDraft((prev) => [
																				...prev,
																				{ ...item, available: 1 },
																			]);
																		}}
																	>
																		<PlusIcon className="h-3 w-3" />
																	</Button>
																</div>
															</div>
														))}
													{labEquipment.filter(
														(item) =>
															!sessionEquipmentDraft.some(
																(eq) => eq.id === item.id,
															),
													).length === 0 && (
														<div className="text-muted-foreground text-sm italic">
															All lab equipment is already in this session
														</div>
													)}
												</div>
											) : (
												<div className="text-muted-foreground text-sm italic">
													No lab equipment available to add
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
													<div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
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
									<div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
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
										<div className="mb-4 rounded-xl border border-border/40 bg-muted/30 p-4 text-center text-muted-foreground text-sm">
											Select a seat to book. Equipment options will appear after
											seat selection.
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
		</div>
	);
};

export default Lab;
