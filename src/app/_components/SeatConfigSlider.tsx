"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import * as Slider from "@radix-ui/react-slider";
import React, { useState, useEffect } from "react";
import type { LabConfig } from "./SeatGrid";
import { DEFAULT_LAB_CONFIG } from "./SeatGrid";

interface SeatConfigSliderProps {
	initialConfig?: LabConfig;
	onSave: (config: LabConfig) => void;
	onCancel?: () => void;
	screenSide?: "left" | "right";
}

const SeatConfigSlider = ({
	initialConfig = DEFAULT_LAB_CONFIG,
	onSave,
	onCancel,
	screenSide = "left",
}: SeatConfigSliderProps) => {
	const [config, setConfig] = useState<LabConfig>(initialConfig);

	// Reset config when initialConfig changes
	useEffect(() => {
		setConfig(initialConfig);
	}, [initialConfig]);

	const updateRowSeats = (rowIndex: number, seats: number) => {
		const newRows = [...config.rows];
		if (newRows[rowIndex]) {
			newRows[rowIndex] = { ...newRows[rowIndex], seats };
		}
		setConfig({ ...config, rows: newRows });
	};

	const toggleEdgeSeat = () => {
		setConfig({ ...config, edgeSeat: !config.edgeSeat });
	};

	// Calculate total seats for preview
	const totalSeats =
		config.rows.reduce((acc, row) => acc + row.seats, 0) +
		(config.edgeSeat ? 1 : 0);

	// Preview render
	const renderPreview = () => {
		const screenCol = (
			<div className="flex shrink-0 flex-col justify-between gap-3">
				<div className="flex h-28 w-14 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-[9px] text-muted-foreground uppercase">
					Screen
				</div>
				<div className="flex h-8 w-14 items-center justify-center rounded border border-border/40 bg-muted/40 text-[8px] text-muted-foreground">
					Door
				</div>
			</div>
		);

		const seatsCol = (
			<div className="flex flex-1 flex-col gap-2">
				<div className="flex items-center gap-2">
					{screenSide === "right" && config.edgeSeat && (
						<div className="flex h-[88px] w-14 shrink-0 items-center justify-center rounded bg-primary/20 text-[9px] text-primary">
							Edge
						</div>
					)}
					<div className="flex flex-1 flex-col gap-1">
						{/* Row A */}
						{config.rows[0] && (
							<div className="flex gap-1">
								{Array.from({ length: config.rows[0].seats }).map((_, i) => (
									<div
										key={`${config.rows[0]?.name}-${i + 1}`}
										className="flex h-10 flex-1 items-center justify-center rounded bg-primary/20 text-[9px] text-primary"
									>
										{config.rows[0]?.name}
										{i + 1}
									</div>
								))}
							</div>
						)}

						{/* Row B */}
						{config.rows[1] && (
							<div className="flex gap-1">
								{Array.from({ length: config.rows[1].seats }).map((_, i) => (
									<div
										key={`${config.rows[1]?.name}-${i + 1}`}
										className="flex h-10 flex-1 items-center justify-center rounded bg-primary/20 text-[9px] text-primary"
									>
										{config.rows[1]?.name}
										{i + 1}
									</div>
								))}
							</div>
						)}
					</div>
					{screenSide === "left" && config.edgeSeat && (
						<div className="flex h-[88px] w-14 shrink-0 items-center justify-center rounded bg-primary/20 text-[9px] text-primary">
							Edge
						</div>
					)}
				</div>

				{/* Remaining rows (C, D, etc.) */}
				{config.rows.length > 2 && (
					<div className="mt-1 flex flex-col gap-1 border-border/40 border-t pt-2">
						{config.rows.slice(2).map((row) => (
							<div key={row.name} className="flex gap-1">
								{Array.from({ length: row.seats }).map((_, i) => (
									<div
										key={`${row.name}-${i + 1}`}
										className="flex h-10 flex-1 items-center justify-center rounded bg-primary/20 text-[9px] text-primary"
									>
										{row.name}
										{i + 1}
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</div>
		);

		return (
			<div className="flex items-stretch gap-3">
				{screenSide === "left" && screenCol}
				{seatsCol}
				{screenSide === "right" && screenCol}
			</div>
		);
	};

	return (
		<Card className="w-full max-w-lg">
			<CardHeader>
				<CardTitle className="text-lg">Configure Seat Layout</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Row configuration */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label className="font-medium text-sm">Rows</Label>
					</div>

					{config.rows.map((row, index) => (
						<div key={row.name} className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-muted-foreground text-sm">
									Row {row.name}: {row.seats} seats
								</Label>
							</div>
							<Slider.Root
								className="relative flex h-5 w-full touch-none select-none items-center"
								value={[row.seats]}
								onValueChange={([value]) => updateRowSeats(index, value ?? 6)}
								min={1}
								max={12}
								step={1}
							>
								<Slider.Track className="relative h-2 flex-grow rounded-full bg-muted">
									<Slider.Range className="absolute h-full rounded-full bg-primary" />
								</Slider.Track>
								<Slider.Thumb
									className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
									aria-label={`Row ${row.name} seats`}
								/>
							</Slider.Root>
							<div className="flex justify-between text-muted-foreground text-xs">
								<span>1</span>
								<span>12</span>
							</div>
						</div>
					))}
				</div>

				{/* Edge seat toggle */}
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="edge-seat">Edge Seat</Label>
						<p className="text-muted-foreground text-xs">
							Add a single seat at the meeting point of rows A & B
						</p>
					</div>
					<Switch
						id="edge-seat"
						checked={config.edgeSeat}
						onCheckedChange={toggleEdgeSeat}
					/>
				</div>

				{/* Preview */}
				<div className="space-y-2">
					<Label className="font-medium text-sm">Preview</Label>
					<div className="mt-2 rounded-lg border border-border/40 bg-muted/20 p-3">
						{renderPreview()}
						<div className="mt-2 text-center text-muted-foreground text-xs">
							Total: {totalSeats} seats
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-2 pt-2">
					<Button className="flex-1" onClick={() => onSave(config)}>
						Save Configuration
					</Button>
					{onCancel && (
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export default SeatConfigSlider;
