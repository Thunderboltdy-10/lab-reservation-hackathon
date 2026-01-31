"use client";

import React, { useState, useEffect } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { LabConfig, RowConfig } from "./SeatGrid";
import { DEFAULT_LAB_CONFIG } from "./SeatGrid";

interface SeatConfigSliderProps {
  initialConfig?: LabConfig;
  onSave: (config: LabConfig) => void;
  onCancel?: () => void;
}

const SeatConfigSlider = ({
  initialConfig = DEFAULT_LAB_CONFIG,
  onSave,
  onCancel,
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

  const addRow = () => {
    const nextRowName = String.fromCharCode(
      65 + config.rows.length // A = 65, B = 66, etc.
    );
    const newRows: RowConfig[] = [...config.rows, { name: nextRowName, seats: 6 }];
    setConfig({ ...config, rows: newRows });
  };

  const removeRow = (index: number) => {
    if (config.rows.length <= 1) return; // Keep at least one row
    const newRows = config.rows.filter((_, i) => i !== index);
    setConfig({ ...config, rows: newRows });
  };

  // Calculate total seats for preview
  const totalSeats =
    config.rows.reduce((acc, row) => acc + row.seats, 0) +
    (config.edgeSeat ? 1 : 0);

  // Preview render
  const renderPreview = () => {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="mb-2 rounded bg-muted px-4 py-1 text-muted-foreground text-xs">
          Screen
        </div>
        {config.rows.map((row) => (
          <div key={row.name} className="flex gap-1">
            {Array.from({ length: row.seats }).map((_, i) => (
              <div
                key={i}
                className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-[10px] text-primary"
              >
                {row.name}
                {i + 1}
              </div>
            ))}
          </div>
        ))}
        {config.edgeSeat && (
          <div className="mt-2 flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-[10px] text-primary">
            E
          </div>
        )}
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
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={config.rows.length >= 10}
            >
              + Add Row
            </Button>
          </div>

          {config.rows.map((row, index) => (
            <div key={row.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-sm">
                  Row {row.name}: {row.seats} seats
                </Label>
                {config.rows.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                    className="h-6 px-2 text-destructive text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Slider.Root
                className="relative flex h-5 w-full touch-none items-center select-none"
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
          <div className="rounded-lg border bg-card p-4">
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
