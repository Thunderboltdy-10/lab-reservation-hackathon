"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

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
        "flex h-16 min-w-[84px] flex-col items-center justify-center rounded-lg font-semibold text-sm",
        "transition-all duration-300 ease-out",
        getSeatColor(),
        (!isClickable || disabled) && "cursor-default pointer-events-none shadow-none",
        isClickable && "cursor-pointer shadow-md hover:shadow-lg",
        className
      )}
      title={
        occupantName
          ? `${name} - ${occupantName}${isPending ? " (Pending)" : ""}`
          : name
      }
    >
      <span className="text-base font-bold">{name}</span>
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
  onSeatClick: (seatName: string, isOccupied: boolean, isUserSeat: boolean) => void;
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
    occupiedSeats.forEach((seat) => {
      map.set(seat.name, seat);
    });
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
        />
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
        onClick={isClickable ? () => onSeatClick(seatName, isOccupied, isUserSeat) : undefined}
        disabled={!isClickable}
        tabIndex={isClickable ? 0 : -1}
        aria-disabled={!isClickable}
        className={cn(
          "flex h-[140px] w-24 flex-col items-center justify-center rounded-lg font-semibold text-sm",
          "transition-all duration-300 ease-out",
          !selectionActive && !isOccupied && !isUserSeat && !isPending
            ? "bg-muted/70 text-muted-foreground border border-border/60"
            : isPending
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : isUserSeat
            ? "bg-sky-500 hover:bg-sky-600 text-white"
            : isOccupied
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            : "bg-primary hover:bg-primary/90 text-primary-foreground",
          (!isClickable || disabled) && "cursor-default pointer-events-none shadow-none",
          isClickable && "cursor-pointer shadow-md hover:shadow-lg"
        )}
        title={occupantName ? `${seatName} - ${occupantName}${isPending ? " (Pending)" : ""}` : seatName}
      >
        <span className="text-base font-bold">{seatName}</span>
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
    <div className={cn(
      "flex flex-col justify-between gap-4 shrink-0",
      screenSide === "left" ? "items-start" : "items-end"
    )}>
      <div className="flex h-40 w-16 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wide font-medium">
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
      <div className="w-full flex gap-5 items-stretch">
        {screenSide === "left" && <ScreenDoorColumn />}

        <div className="flex-1 flex flex-col gap-4">
          {/* Rows A and B with edge seat */}
          <div className="flex items-center gap-4">
            {edgeOnLeft && edgeSeat && (
              <div className="shrink-0">{edgeSeat}</div>
            )}
            <div className="flex-1 flex flex-col gap-3">
              {rowA && <div className="flex gap-3">{renderRow(rowA, 0)}</div>}
              {rowB && <div className="flex gap-3">{renderRow(rowB, 1)}</div>}
            </div>
            {!edgeOnLeft && edgeSeat && (
              <div className="shrink-0">{edgeSeat}</div>
            )}
          </div>

          {/* Remaining rows */}
          {remainingRows.length > 0 && (
            <div className="flex flex-col gap-3 mt-3 pt-4 border-t border-border/40">
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
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        showLegend ? "max-h-24 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
      )}>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-primary"></div>
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-destructive"></div>
            <span className="text-muted-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-sky-500"></div>
            <span className="text-muted-foreground">Your Booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-500"></div>
            <span className="text-muted-foreground">Pending</span>
          </div>
        </div>
      </div>

      {/* Capacity indicator - only shows when session is selected */}
      <div className={cn(
        "text-muted-foreground text-sm transition-all duration-300 ease-out",
        showCapacity ? "opacity-100 mt-2" : "opacity-0 mt-0 h-0"
      )}>
        {occupiedCount} / {totalSeats} seats occupied
      </div>
    </div>
  );
};

// Helper function to parse config from database
export const parseLabConfig = (configJson: string | null | undefined): LabConfig => {
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
