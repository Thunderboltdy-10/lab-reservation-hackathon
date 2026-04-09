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
	const getSeatColor = () => {
		// When no session is selected - gray, visible, no interaction styling
		if (!selectionActive && !isOccupied && !isUserSeat && !isPending) {
			return "bg-muted/70 text-muted-foreground border border-border/60";
		}
		if (isPending) {
			return "bg-amber-500 hover:bg-amber-600 text-white"; // Pending approval
		}
		if (isUserSeat) {
			return "bg-sky-500 hover:bg-sky-600 text-white"; // Your booking - distinct from pending
		}
		if (isOccupied) {
			return "bg-destructive hover:bg-destructive/90 text-destructive-foreground"; // Occupied
		}
		return "bg-primary hover:bg-primary/90 text-primary-foreground"; // Available
	};

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
				"flex h-16 min-w-[84px] flex-col items-center justify-center rounded-xl font-semibold text-sm",
				"transition-all duration-300 ease-out",
				getSeatColor(),
				(!isClickable || disabled) &&
					"pointer-events-none cursor-default shadow-none",
				isClickable && "cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.05] ring-offset-background hover:ring-2 hover:ring-offset-2 hover:ring-primary/50",
				className,
			)}
			title={
				occupantName
					? `${name} - ${occupantName}${isPending ? " (Pending)" : ""}`
					: name
			}
		>
			<span className="font-bold text-base">{name}</span>
			{isOccupied && occupantName && (
				<span className="max-w-[72px] truncate text-[11px] opacity-90">
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
					"flex h-[140px] w-24 flex-col items-center justify-center rounded-xl font-semibold text-sm",
					"transition-all duration-300 ease-out",
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
					isClickable && "cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.05] ring-offset-background hover:ring-2 hover:ring-offset-2 hover:ring-primary/50",
				)}
				title={
					occupantName
						? `${seatName} - ${occupantName}${isPending ? " (Pending)" : ""}`
						: seatName
				}
			>
				<span className="font-bold text-base">{seatName}</span>
				{isOccupied && occupantName && (
					<span className="max-w-[72px] truncate text-[11px] opacity-90">
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

	// Screen/Door column
	const ScreenDoorColumn = () => (
		<div
			className={cn(
				"flex shrink-0 flex-col justify-between gap-4",
				screenSide === "left" ? "items-start" : "items-end",
			)}
		>
			<div className="flex h-40 w-16 items-center justify-center rounded-xl border border-border/60 bg-muted/50 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
				Screen
			</div>
			<div className="flex h-10 w-16 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-[10px] text-muted-foreground">
				Door
			</div>
		</div>
	);

	return (
		<div className="flex w-full flex-col items-stretch">
			{/* Main grid */}
			<div className="flex w-full items-stretch gap-5">
				{screenSide === "left" && <ScreenDoorColumn />}

				<div className="flex flex-1 flex-col gap-4">
					{/* Rows A and B with edge seat */}
					<div className="flex items-center gap-4">
						{edgeOnLeft && edgeSeat && (
							<div className="shrink-0">{edgeSeat}</div>
						)}
						<div className="flex flex-1 flex-col gap-3">
							{rowA && <div className="flex gap-3">{renderRow(rowA, 0)}</div>}
							{rowB && <div className="flex gap-3">{renderRow(rowB, 1)}</div>}
						</div>
						{!edgeOnLeft && edgeSeat && (
							<div className="shrink-0">{edgeSeat}</div>
						)}
					</div>

					{/* Remaining rows */}
					{remainingRows.length > 0 && (
						<div className="mt-3 flex flex-col gap-3 border-border/40 border-t pt-4">
							{remainingRows.map((rowConfig, index) => (
								<div key={rowConfig.name} className="flex gap-3">
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
