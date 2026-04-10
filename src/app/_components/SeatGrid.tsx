"use client";

import { cn } from "@/lib/utils";
import React, { useMemo } from "react";

// Type for row configuration from database
export interface RowConfig {
	name: string;
	seats: number;
}

export interface LabConfig {
	rows: RowConfig[];
	edgeSeat?: boolean;
}

// Default physics/biology lab configuration
export const DEFAULT_LAB_CONFIG: LabConfig = {
	rows: [
		{ name: "A", seats: 6 },
		{ name: "B", seats: 6 },
		{ name: "C", seats: 6 },
	],
	edgeSeat: true,
};

interface SeatProps {
	name: string;
	isOccupied: boolean;
	isUserSeat: boolean;
	isPending: boolean;
	occupantName?: string;
	onClick?: () => void;
	disabled?: boolean;
	selectionActive?: boolean;
	className?: string;
}

interface SeatClassOptions {
	isPending: boolean;
	isUserSeat: boolean;
	isOccupied: boolean;
	isClickable: boolean;
	disabled?: boolean;
	selectionActive: boolean;
}

const getSeatClasses = ({
	isPending,
	isUserSeat,
	isOccupied,
	isClickable,
	disabled,
	selectionActive,
}: SeatClassOptions) =>
	cn(
		!selectionActive && !isOccupied && !isUserSeat && !isPending
			? "border border-border/60 bg-muted/70 text-muted-foreground"
			: isPending
				? "bg-amber-500 text-white hover:bg-amber-600"
				: isUserSeat
					? "bg-sky-500 text-white hover:bg-sky-600"
					: isOccupied
						? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
						: "bg-primary text-primary-foreground hover:bg-primary/90",
		(!isClickable || disabled) &&
			"pointer-events-none cursor-default shadow-none",
		isClickable &&
			"hover:-translate-y-1.5 cursor-pointer shadow-sm ring-offset-background hover:scale-[1.05] hover:shadow-xl hover:ring-2 hover:ring-primary/50 hover:ring-offset-2",
	);

const Seat = ({
	name,
	isOccupied,
	isUserSeat,
	isPending,
	occupantName,
	onClick,
	disabled,
	selectionActive = true,
	className,
}: SeatProps) => {
	// Completely disable interaction when no session selected (non-teacher)
	const isClickable = selectionActive && !disabled;

	return (
		<button
			type="button"
			onClick={isClickable ? onClick : undefined}
			disabled={!isClickable}
			tabIndex={isClickable ? 0 : -1}
			aria-disabled={!isClickable}
			className={cn(
				"flex h-12 w-full min-w-[60px] flex-col items-center justify-center rounded-xl font-semibold text-sm sm:h-16 sm:min-w-[80px]",
				"transition-all duration-300 ease-out",
				getSeatClasses({
					isPending,
					isUserSeat,
					isOccupied,
					isClickable,
					disabled,
					selectionActive,
				}),
				className,
			)}
			title={
				occupantName
					? `${name} - ${occupantName}${isPending ? " (Pending)" : ""}`
					: name
			}
		>
			<span className="font-bold text-sm sm:text-base">{name}</span>
			{isOccupied && occupantName && (
				<span className="max-w-[56px] truncate text-[10px] opacity-90 sm:max-w-[72px] sm:text-[11px]">
					{occupantName.split(" ")[0]}
				</span>
			)}
		</button>
	);
};

interface SeatInfo {
	id: string;
	name: string;
	userId?: string;
	status?: string;
	user?: {
		firstName: string;
		lastName: string;
	};
}

interface SeatGridProps {
	config: LabConfig;
	occupiedSeats: SeatInfo[];
	currentUserId: string | null | undefined;
	onSeatClick: (
		seatName: string,
		isOccupied: boolean,
		isUserSeat: boolean,
	) => void;
	disabled?: boolean;
	showLegend?: boolean;
	screenSide?: "left" | "right";
	selectionActive?: boolean;
	showCapacity?: boolean;
}

const SeatGrid = ({
	config,
	occupiedSeats,
	currentUserId,
	onSeatClick,
	disabled = false,
	showLegend = true,
	screenSide = "left",
	selectionActive = true,
	showCapacity = true,
}: SeatGridProps) => {
	// Create a map for quick lookup of occupied seats
	const occupiedSeatMap = useMemo(() => {
		const map = new Map<string, SeatInfo>();
		for (const seat of occupiedSeats) {
			map.set(seat.name, seat);
		}
		return map;
	}, [occupiedSeats]);

	// Generate seats for a row
	const renderRow = (rowConfig: RowConfig, rowIndex: number) => {
		const seats = [];
		for (let i = 1; i <= rowConfig.seats; i++) {
			const seatName = `${rowConfig.name}${i}`;
			const seatInfo = occupiedSeatMap.get(seatName);
			const isOccupied = !!seatInfo;
			const isUserSeat = seatInfo?.userId === currentUserId;
			const isPending = seatInfo?.status === "PENDING_APPROVAL";
			const occupantName = seatInfo?.user
				? `${seatInfo.user.firstName} ${seatInfo.user.lastName}`
				: undefined;

			seats.push(
				<Seat
					key={seatName}
					name={seatName}
					isOccupied={isOccupied}
					isUserSeat={isUserSeat}
					isPending={isPending}
					occupantName={occupantName}
					onClick={() => onSeatClick(seatName, isOccupied, isUserSeat)}
					disabled={disabled}
					selectionActive={selectionActive}
					className="flex-1"
				/>,
			);
		}
		return seats;
	};

	// Render edge seat if configured - height matches rows A+B + gap
	const renderEdgeSeat = () => {
		if (!config.edgeSeat) return null;

		const seatName = "Edge";
		const seatInfo = occupiedSeatMap.get(seatName);
		const isOccupied = !!seatInfo;
		const isUserSeat = seatInfo?.userId === currentUserId;
		const isPending = seatInfo?.status === "PENDING_APPROVAL";
		const occupantName = seatInfo?.user
			? `${seatInfo.user.firstName} ${seatInfo.user.lastName}`
			: undefined;

		const isClickable = selectionActive && !disabled;

		return (
			<button
				type="button"
				onClick={
					isClickable
						? () => onSeatClick(seatName, isOccupied, isUserSeat)
						: undefined
				}
				disabled={!isClickable}
				tabIndex={isClickable ? 0 : -1}
				aria-disabled={!isClickable}
				className={cn(
					"flex h-[120px] w-16 flex-col items-center justify-center rounded-xl font-semibold text-sm sm:h-[140px] sm:w-20 md:w-24",
					"transition-all duration-300 ease-out",
					getSeatClasses({
						isPending,
						isUserSeat,
						isOccupied,
						isClickable,
						disabled,
						selectionActive,
					}),
				)}
				title={
					occupantName
						? `${seatName} - ${occupantName}${isPending ? " (Pending)" : ""}`
						: seatName
				}
			>
				<span className="font-bold text-sm sm:text-base">{seatName}</span>
				{isOccupied && occupantName && (
					<span className="max-w-[56px] truncate text-[10px] opacity-90 sm:max-w-[72px] sm:text-[11px]">
						{occupantName.split(" ")[0]}
					</span>
				)}
			</button>
		);
	};

	// Calculate total seats
	const totalSeats =
		config.rows.reduce((acc, row) => acc + row.seats, 0) +
		(config.edgeSeat ? 1 : 0);
	const occupiedCount = occupiedSeats.length;

	const [rowA, rowB, ...remainingRows] = config.rows;
	const edgeSeat = renderEdgeSeat();
	const edgeOnLeft = screenSide === "right";

	// Screen/Door column - responsive widths that scale down
	const ScreenDoorColumn = () => (
		<div
			className={cn(
				"flex shrink-0 flex-col justify-between gap-2 sm:gap-3 md:gap-4",
				screenSide === "left" ? "items-start" : "items-end",
			)}
		>
			<div className="flex h-28 w-12 items-center justify-center rounded-xl border border-border/60 bg-muted/50 font-medium text-[10px] text-muted-foreground uppercase tracking-wide sm:h-36 sm:w-14 sm:text-[11px] md:h-40 md:w-16">
				Screen
			</div>
			<div className="flex h-8 w-12 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-[9px] text-muted-foreground sm:h-9 sm:w-14 sm:text-[10px] md:h-10 md:w-16">
				Door
			</div>
		</div>
	);

	return (
		<div className="flex w-full flex-col items-stretch overflow-x-auto overflow-y-hidden">
			{/* Main grid keeps vertical clipping but allows horizontal scroll on smaller screens */}
			<div className="flex w-full items-stretch gap-3 overflow-x-auto overflow-y-hidden sm:gap-4 md:gap-5">
				{screenSide === "left" && <ScreenDoorColumn />}

				<div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-3 md:gap-4">
					{/* Rows A and B with edge seat */}
					<div className="flex min-w-0 items-center gap-3 sm:gap-3 md:gap-4">
						{edgeOnLeft && edgeSeat && (
							<div className="shrink-0">{edgeSeat}</div>
						)}
						<div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2 md:gap-3">
							{rowA && (
								<div className="flex min-w-0 gap-2 sm:gap-2 md:gap-3">
									{renderRow(rowA, 0)}
								</div>
							)}
							{rowB && (
								<div className="flex min-w-0 gap-2 sm:gap-2 md:gap-3">
									{renderRow(rowB, 1)}
								</div>
							)}
						</div>
						{!edgeOnLeft && edgeSeat && (
							<div className="shrink-0">{edgeSeat}</div>
						)}
					</div>

					{/* Remaining rows */}
					{remainingRows.length > 0 && (
						<div className="mt-2 flex min-w-0 flex-col gap-2 border-border/40 border-t pt-3 sm:mt-2 sm:gap-2 sm:pt-3 md:mt-3 md:gap-3 md:pt-4">
							{remainingRows.map((rowConfig, index) => (
								<div
									key={rowConfig.name}
									className="flex min-w-0 gap-2 sm:gap-2 md:gap-3"
								>
									{renderRow(rowConfig, index + 2)}
								</div>
							))}
						</div>
					)}
				</div>

				{screenSide === "right" && <ScreenDoorColumn />}
			</div>

			{/* Legend - only shows when session is selected, with animation */}
			<div
				className={cn(
					"overflow-hidden transition-all duration-300 ease-out",
					showLegend ? "mt-4 max-h-24 opacity-100" : "mt-0 max-h-0 opacity-0",
				)}
			>
				<div className="flex flex-wrap justify-center gap-4 text-sm">
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 rounded bg-primary" />
						<span className="text-muted-foreground">Available</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 rounded bg-destructive" />
						<span className="text-muted-foreground">Occupied</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 rounded bg-sky-500" />
						<span className="text-muted-foreground">Your Booking</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 rounded bg-amber-500" />
						<span className="text-muted-foreground">Pending</span>
					</div>
				</div>
			</div>

			{/* Capacity indicator - only shows when session is selected */}
			<div
				className={cn(
					"text-muted-foreground text-sm transition-all duration-300 ease-out",
					showCapacity ? "mt-2 opacity-100" : "mt-0 h-0 opacity-0",
				)}
			>
				{occupiedCount} / {totalSeats} seats occupied
			</div>
		</div>
	);
};

// Helper function to parse config from database
export const parseLabConfig = (
	configJson: string | null | undefined,
): LabConfig => {
	if (!configJson) return DEFAULT_LAB_CONFIG;

	try {
		const parsed = JSON.parse(configJson);
		if (parsed.rows && Array.isArray(parsed.rows)) {
			return parsed as LabConfig;
		}
		return DEFAULT_LAB_CONFIG;
	} catch {
		return DEFAULT_LAB_CONFIG;
	}
};

export const getTotalSeats = (config: LabConfig) => {
	const base = config.rows.reduce((acc, row) => acc + row.seats, 0);
	return base + (config.edgeSeat ? 1 : 0);
};

export default SeatGrid;
