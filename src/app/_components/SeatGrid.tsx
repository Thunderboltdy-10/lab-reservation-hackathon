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
  isTeacher?: boolean;
}

const Seat = ({
  name,
  isOccupied,
  isUserSeat,
  isPending,
  occupantName,
  onClick,
  disabled,
  isTeacher,
}: SeatProps) => {
  const getSeatColor = () => {
    if (isPending) {
      return "bg-amber-500 hover:bg-amber-600 text-white"; // Pending approval
    }
    if (isUserSeat) {
      return "bg-yellow-400 hover:bg-yellow-500 text-yellow-900"; // Your booking
    }
    if (isOccupied) {
      return "bg-destructive hover:bg-destructive/90 text-destructive-foreground"; // Occupied
    }
    return "bg-primary hover:bg-primary/90 text-primary-foreground"; // Available
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 w-12 flex-col items-center justify-center rounded-lg font-semibold text-sm transition-all duration-150",
        getSeatColor(),
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer shadow-md hover:scale-105 hover:shadow-lg"
      )}
      title={
        occupantName
          ? `${name} - ${occupantName}${isPending ? " (Pending)" : ""}`
          : name
      }
    >
      <span className="text-xs font-bold">{name}</span>
      {isOccupied && occupantName && (
        <span className="max-w-[40px] truncate text-[8px] opacity-80">
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
  isTeacher?: boolean;
  showLegend?: boolean;
}

const SeatGrid = ({
  config,
  occupiedSeats,
  currentUserId,
  onSeatClick,
  disabled = false,
  isTeacher = false,
  showLegend = true,
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
          isTeacher={isTeacher}
        />
      );
    }
    return seats;
  };

  // Render edge seat if configured
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

    return (
      <div className="mt-4 flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-muted-foreground text-xs">Edge</span>
          <Seat
            name="Edge"
            isOccupied={isOccupied}
            isUserSeat={isUserSeat}
            isPending={isPending}
            occupantName={occupantName}
            onClick={() => onSeatClick(seatName, isOccupied, isUserSeat)}
            disabled={disabled}
            isTeacher={isTeacher}
          />
        </div>
      </div>
    );
  };

  // Calculate total seats
  const totalSeats =
    config.rows.reduce((acc, row) => acc + row.seats, 0) +
    (config.edgeSeat ? 1 : 0);
  const occupiedCount = occupiedSeats.length;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Screen/Board indicator */}
      <div className="mb-2 rounded-lg bg-muted px-8 py-2 text-muted-foreground text-sm">
        Screen / Whiteboard
      </div>

      {/* Seat grid */}
      <div className="flex flex-col gap-4">
        {config.rows.map((rowConfig, index) => (
          <div key={rowConfig.name} className="flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-xs">
              Row {rowConfig.name}
            </span>
            <div className="flex gap-2">{renderRow(rowConfig, index)}</div>
          </div>
        ))}
        {renderEdgeSeat()}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-primary"></div>
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-destructive"></div>
            <span className="text-muted-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-yellow-400"></div>
            <span className="text-muted-foreground">Your Booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-500"></div>
            <span className="text-muted-foreground">Pending Approval</span>
          </div>
        </div>
      )}

      {/* Capacity indicator */}
      <div className="text-muted-foreground text-sm">
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

export default SeatGrid;
