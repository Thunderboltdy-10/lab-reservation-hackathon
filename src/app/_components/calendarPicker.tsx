"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { equipmentAtom, isBookingAtom } from "@/lib/atoms";
import { api } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { useAtom } from "jotai";
import { Clock } from "lucide-react";
import { useTheme } from "next-themes";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getTotalSeats, parseLabConfig } from "./SeatGrid";

// School timezone - configurable via environment variable
const SCHOOL_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Madrid";

// Helper function to format time in school timezone
const formatTimeInSchoolTZ = (date: Date, format = "HH:mm") => {
	return formatInTimeZone(date, SCHOOL_TIMEZONE, format);
};

// Helper function to format date in school timezone
const formatDateInSchoolTZ = (date: Date, format = "EEEE, MMMM d, yyyy") => {
	return formatInTimeZone(date, SCHOOL_TIMEZONE, format);
};

const parseTimeString = (timeString: string) => {
	const segments = timeString.split(":");
	const rawHours = segments[0];
	const rawMinutes = segments[1];

	if (rawHours === undefined || rawMinutes === undefined) {
		return null;
	}

	const hours = Number(rawHours);
	const minutes = Number(rawMinutes);

	if (
		Number.isNaN(hours) ||
		Number.isNaN(minutes) ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59
	) {
		return null;
	}

	return { hours, minutes };
};

// Helper to create a date in school timezone from time string and base date
const createDateInSchoolTZ = (baseDate: Date, timeString: string): Date => {
	const parsedTime = parseTimeString(timeString);
	const zonedDate = toZonedTime(baseDate, SCHOOL_TIMEZONE);
	if (!parsedTime) {
		return fromZonedTime(zonedDate, SCHOOL_TIMEZONE);
	}
	zonedDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
	return fromZonedTime(zonedDate, SCHOOL_TIMEZONE);
};

const addMinutes = (date: Date, minutes: number) =>
	new Date(date.getTime() + minutes * 60 * 1000);

const CalendarPicker = ({
	lab,
	isTeacher,
}: {
	lab: string | null;
	isTeacher: boolean;
}) => {
	const [date, setDate] = React.useState<Date | undefined>(undefined);
	const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
	const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
	const [endAuto, setEndAuto] = React.useState(true);

	const [isPopupOpenAdd, setIsPopupOpenAdd] = useState(false);
	const [, setLockTick] = useState(0);

	const [booking, setBooking] = useAtom(isBookingAtom);
	const [equipment, setEquipment] = useAtom(equipmentAtom);

	const { userId } = useAuth();
	const { theme } = useTheme();

	const { data: labId } = api.account.getLabId.useQuery(
		{
			lab: lab ?? "",
		},
		{
			enabled: !!lab,
		},
	);

	const totalSeats = useMemo(() => {
		return getTotalSeats(parseLabConfig(labId?.defaultRowConfig));
	}, [labId?.defaultRowConfig]);

	const createSessionMutation = api.account.createSession.useMutation();
	const updateSessionMutation = api.account.updateSession.useMutation();
	const removeSessionMutation = api.account.removeSession.useMutation();

	const normalisedDate = useMemo(() => {
		if (!date) return undefined;
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}, [date]);

	const { data, refetch } = api.account.getSession.useQuery(
		{
			labId: labId?.id ?? "",
			date: normalisedDate,
		},
		{
			enabled: !!date && !!labId?.id,
			staleTime: 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			refetchOnReconnect: false,
		},
	);

	const hasOverlap = (start: Date, end: Date, excludeId?: string) => {
		return (
			data?.some((sess) => {
				if (excludeId && sess.id === excludeId) return false;
				const existingStart = new Date(sess.startAt);
				const existingEnd = new Date(sess.endAt);
				return start < existingEnd && end > existingStart;
			}) ?? false
		);
	};

	const createSession = () => {
		setBooking(null);
		setEquipment(null);
		if (!date || !lab || !labId?.id) return;

		if (!startDate || !endDate) return;

		if (endDate <= startDate) {
			toast.error("End time must be after the start time");
			return;
		}

		if (endDate.getTime() - startDate.getTime() < 5 * 60 * 1000) {
			toast.error("Session must be at least 5 minutes long");
			return;
		}

		if (hasOverlap(startDate, endDate)) {
			toast.error("Session overlaps with an existing session");
			return;
		}

		createSessionMutation.mutate(
			{
				labId: labId.id,
				startAt: startDate,
				endAt: endDate,
			},
			{
				onSuccess: () => {
					setIsPopupOpenAdd(false);
					toast.success("Session successfully created");
					refetch();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const updateSession = (id: string) => {
		setBooking(null);
		setEquipment(null);
		if (!date || !lab || !labId?.id || !id) return;

		if (!startDate || !endDate) return;

		if (endDate <= startDate) {
			toast.error("End time must be after the start time");
			return;
		}

		if (endDate.getTime() - startDate.getTime() < 5 * 60 * 1000) {
			toast.error("Session must be at least 5 minutes long");
			return;
		}

		if (hasOverlap(startDate, endDate, id)) {
			toast.error("Session overlaps with an existing session");
			return;
		}

		updateSessionMutation.mutate(
			{
				labId: labId.id,
				id,
				startAt: startDate,
				endAt: endDate,
			},
			{
				onSuccess: () => {
					toast.success("Session successfully edited");
					refetch();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const removeSession = (id: string) => {
		if (booking === id) setBooking(null);
		if (equipment === id) setEquipment(null);
		if (!id) return;

		removeSessionMutation.mutate(
			{
				id,
			},
			{
				onSuccess: () => {
					toast.success("Session successfully removed");
					refetch();
				},
			},
		);
	};

	useEffect(() => {
		setDate(new Date());

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setBooking(null);
				setEquipment(null);
			}
		};

		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [setBooking, setEquipment]);

	useEffect(() => {
		return () => {
			setBooking(null);
			setEquipment(null);
		};
	}, [setBooking, setEquipment]);

	useEffect(() => {
		refetch();
		if (date) {
			const start = createDateInSchoolTZ(date, getCurrentTimeInSchoolTZ());
			const end = addMinutes(start, 55);
			setStartDate(start);
			setEndDate(end);
			setEndAuto(true);
		}
		setBooking(null);
		setEquipment(null);
	}, [date, refetch, setBooking, setEquipment]);

	useEffect(() => {
		if (!isPopupOpenAdd || !date) return;
		const start = createDateInSchoolTZ(date, getCurrentTimeInSchoolTZ());
		const end = addMinutes(start, 55);
		setStartDate(start);
		setEndDate(end);
		setEndAuto(true);
	}, [isPopupOpenAdd, date]);

	// Get current time in school timezone for default values
	const getCurrentTimeInSchoolTZ = () => {
		return formatTimeInSchoolTZ(new Date(), "HH:mm");
	};

	const controlsLocked = booking !== null || equipment !== null;

	useEffect(() => {
		const interval = setInterval(() => {
			setLockTick((value) => value + 1);
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	const isSessionLocked = (startAt: Date) => {
		const nowMs = Date.now();
		const lockThresholdMs = startAt.getTime() - 15 * 60 * 1000;
		return nowMs >= lockThresholdMs;
	};

	return (
		<div className="flex flex-col lg:flex-row justify-center gap-12 lg:gap-32 mt-12 mb-12">
			<div className="flex justify-center lg:block">
				<Calendar 
					mode="single" 
					selected={date} 
					onSelect={setDate} 
					className="rounded-2xl border border-border/50 bg-background/50 scale-[1.15] md:scale-125 transform-gpu shadow-sm origin-top mt-4"
				/>
			</div>
			<div className="flex flex-col items-center lg:items-start gap-4 w-full max-w-sm">
				<div className="font-bold text-2xl md:text-3xl tracking-tight">
					<span>
						{date ? formatDateInSchoolTZ(date, "EEEE, MMMM d, yyyy") : ""}
					</span>
				</div>
				{/* Timezone indicator */}
				<div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">
					<Clock className="h-4 w-4" />
					<span>Times shown in {SCHOOL_TIMEZONE}</span>
				</div>
				<div className="flex w-full flex-col gap-4">
				<div
					className={`flex items-center pb-2 ${isTeacher === true ? "justify-between" : ""}`}
				>
					<div className="font-bold text-foreground text-2xl tracking-tight">
						Sessions
					</div>
					{isTeacher === true && (
						<Popover open={isPopupOpenAdd} onOpenChange={setIsPopupOpenAdd}>
							<PopoverTrigger asChild>
								<Button variant="secondary" disabled={controlsLocked}>
									+ Add Session
								</Button>
							</PopoverTrigger>
							<PopoverContent>
								<h3 className="mb-1">Start Time:</h3>
								<Input
									type="time"
									value={
										startDate
											? formatTimeInSchoolTZ(startDate, "HH:mm")
											: getCurrentTimeInSchoolTZ()
									}
									onChange={(e) => {
										if (date) {
											const newStart = createDateInSchoolTZ(
												date,
												e.target.value,
											);
											setStartDate(newStart);
											if (endAuto) {
												setEndDate(addMinutes(newStart, 55));
											}
										}
									}}
								/>
								<h3 className="mt-3 mb-1">End Time:</h3>
								<Input
									type="time"
									value={
										endDate
											? formatTimeInSchoolTZ(endDate, "HH:mm")
											: getCurrentTimeInSchoolTZ()
									}
									onChange={(e) => {
										if (date) {
											const newEnd = createDateInSchoolTZ(
												date,
												e.target.value,
											);
											setEndDate(newEnd);
											setEndAuto(false);
										}
									}}
								/>
								<Button className="mt-5 w-full" onClick={createSession}>
									Create
								</Button>
							</PopoverContent>
						</Popover>
					)}
				</div>
				<div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
					{data?.length === 0 && (
						<div className="mt-2 flex justify-center">
							<div className="text-muted-foreground">
								No sessions found this day
							</div>
						</div>
					)}
						{data?.map((sess) => {
							const locked = isSessionLocked(new Date(sess.startAt)) && !isTeacher;
							return (
								<div key={sess.id}>
								<div className="flex flex-col">
									<div
										className={`relative w-full rounded-lg border bg-card p-1 text-center ${
										booking === sess.id || equipment === sess.id
											? "ring-2 ring-primary"
											: ""
									}`}
								>
									<div className="mb-1 pt-2 font-semibold text-foreground text-lg">
										{formatTimeInSchoolTZ(new Date(sess.startAt))} -{" "}
										{formatTimeInSchoolTZ(new Date(sess.endAt))}
									</div>
									<div className="text-muted-foreground">
										Capacity: {sess.capacity} / {totalSeats}
									</div>
									<div className="text-muted-foreground">
										Created by: {sess.createdBy.firstName}{" "}
										{sess.createdBy.lastName}
									</div>
									<div className="mt-3 grid grid-cols-2 gap-2 p-2">
											{booking !== sess.id ? (
												<Button
													className="flex-1"
													variant={locked ? "outline" : "secondary"}
													onClick={() => {
														if (equipment !== null) {
															toast.error(
															"Finish session equipment first to book a seat",
														);
														return;
													}
													setEquipment(null);
														setBooking(sess.id);
														toast("Press esc to cancel booking");
													}}
													disabled={equipment !== null || locked}
												>
													{locked ? "Locked" : "Book"}
												</Button>
											) : (
											<Button
												className="flex-1"
												onClick={() => setBooking(null)}
												variant="secondary"
											>
												Cancel
											</Button>
										)}
										{isTeacher &&
											(equipment !== sess.id ? (
												<Button
													className="flex-1"
													variant="secondary"
													onClick={() => {
														if (booking !== null) {
															toast.error(
																"Finish booking first to edit session equipment",
															);
															return;
														}
														setBooking(null);
														setEquipment(sess.id);
														toast(
															"Press esc to cancel session equipment selection",
														);
													}}
													disabled={booking !== null}
												>
													Equipment
												</Button>
											) : (
												<Button
													className="flex-1"
													onClick={() => setEquipment(null)}
													variant="secondary"
												>
													Cancel
												</Button>
											))}
										{sess.createdBy.id === userId && isTeacher && (
											<>
												<Dialog>
													<DialogTrigger asChild>
														<Button
															className="flex-1"
															variant="secondary"
															disabled={controlsLocked}
														>
															Remove
														</Button>
													</DialogTrigger>
													<DialogContent>
														<DialogHeader className="flex items-center text-center">
															<DialogTitle>
																Are you sure you want to remove this session?
															</DialogTitle>
															<div className="mt-5 flex w-full gap-2">
																<DialogClose className="flex-1" asChild>
																	<Button
																		variant="destructive"
																		className="flex-1"
																		onClick={() => removeSession(sess.id)}
																	>
																		Remove
																	</Button>
																</DialogClose>
																<DialogClose className="flex-1" asChild>
																	<Button variant="secondary">Cancel</Button>
																</DialogClose>
															</div>
														</DialogHeader>
													</DialogContent>
												</Dialog>
												<Dialog>
													<DialogTrigger asChild>
														<Button
															className="flex-1"
															variant="secondary"
															disabled={controlsLocked}
															onClick={() => {
																const start = new Date(sess.startAt);
																const end = new Date(sess.endAt);
																setStartDate(start);
																setEndDate(end);
																setEndAuto(false);
															}}
														>
															Edit
														</Button>
													</DialogTrigger>
													<DialogContent>
														<DialogHeader className="flex items-center text-center">
															<DialogTitle className="mb-2">
																Edit Session
															</DialogTitle>
															<div className="text-center">
																<h3 className="mb-1">Start Time:</h3>
																<Input
																	type="time"
																	value={
																		startDate
																			? formatTimeInSchoolTZ(startDate, "HH:mm")
																			: formatTimeInSchoolTZ(
																					new Date(sess.startAt),
																				)
																	}
																	onChange={(e) => {
																		if (!date) return;
																		const newDate = createDateInSchoolTZ(
																			date,
																			e.target.value,
																		);
																		setStartDate(newDate);
																		if (endAuto) {
																			setEndDate(addMinutes(newDate, 55));
																		}
																	}}
																/>
																<h3 className="mt-3 mb-1">End Time:</h3>
																<Input
																	type="time"
																	value={
																		endDate
																			? formatTimeInSchoolTZ(endDate, "HH:mm")
																			: formatTimeInSchoolTZ(
																					new Date(sess.endAt),
																				)
																	}
																	onChange={(e) => {
																		if (!date) return;
																		const newDate = createDateInSchoolTZ(
																			date,
																			e.target.value,
																		);
																		setEndDate(newDate);
																		setEndAuto(false);
																	}}
																/>
															</div>
															<div className="mt-5 flex w-full gap-2">
																<DialogClose className="flex-1" asChild>
																	<Button
																		className="flex-1"
																		onClick={() => updateSession(sess.id)}
																	>
																		Edit
																	</Button>
																</DialogClose>
																<DialogClose className="flex-1" asChild>
																	<Button variant="secondary">Cancel</Button>
																</DialogClose>
															</div>
														</DialogHeader>
													</DialogContent>
												</Dialog>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
							);
						})}
				</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarPicker;
