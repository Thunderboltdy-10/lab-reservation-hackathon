"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
  equipmentCount?: number;
}

interface CreatableComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string, label: string) => void;
  onCreateOption?: (inputValue: string) => void;
  onDeleteOption?: (value: string, label: string, equipmentCount?: number) => void;
  placeholder?: string;
  emptyText?: string;
  isCreating?: boolean;
  allowDelete?: boolean;
  allowClear?: boolean;
}

export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreateOption,
  onDeleteOption,
  placeholder = "Select option...",
  emptyText = "No results found.",
  isCreating = false,
  allowDelete = true,
  allowClear = true,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const isSearching = search.trim().length > 0;

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!isSearching) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search, isSearching]);

  // Show create option only when searching and no exact match
  const showCreateOption = isSearching &&
    !options.some((opt) => opt.label.toLowerCase() === search.toLowerCase().trim()) &&
    onCreateOption;

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSearch("");
    } else {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleSelect = (option: Option) => {
    onChange(option.value, option.label);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("", "");
    setOpen(false);
    setSearch("");
  };

  const handleCreate = () => {
    if (onCreateOption && search.trim()) {
      onCreateOption(search.trim());
      // Input stays open so user can see the selection
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "group relative w-full flex items-center justify-between rounded-xl border border-input bg-background px-3 h-10 text-sm",
            "transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
            open && "ring-2 ring-primary/30 border-primary/50",
            !selectedOption && "text-muted-foreground",
          )}
        >
          {/* Text - truncates when search is active */}
          <span className={cn("truncate flex-1 text-left pr-2", !selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          {/* Clear button - only when value exists and closed */}
          {!open && value && allowClear && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute right-8 flex h-5 w-5 items-center justify-center rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}

          {/* Chevron - rotates when open */}
          <ChevronsUpDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform group-hover:opacity-70",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border shadow-lg overflow-hidden"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search / Create bar - inside trigger */}
        <div className="flex items-center border-b bg-muted/30 px-3 py-2 gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type to search or create..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (showCreateOption) handleCreate();
                }
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          {isCreating && <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />}
        </div>

        <Command className="bg-transparent">
          <CommandList
            className="max-h-[240px] overflow-y-auto overflow-x-hidden"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Only show empty when actually searching */}
            {isSearching && filteredOptions.length === 0 && !showCreateOption && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </CommandEmpty>
            )}

            <CommandGroup className="p-1.5">
              {/* "None" option - clear selection */}
              {allowClear && value && (
                <CommandItem
                  value=""
                  onSelect={() => handleClear()}
                  className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent/70 transition-colors"
                >
                  <span className="flex items-center flex-1 min-w-0">
                    <span className="truncate text-sm text-muted-foreground italic">None</span>
                  </span>
                </CommandItem>
              )}

              {/* Options */}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option)}
                  className="group/cmditem relative rounded-lg px-2 py-2 cursor-pointer hover:bg-accent/70 transition-colors"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <span className="truncate text-sm">{option.label}</span>
                    {option.equipmentCount !== undefined && option.equipmentCount > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground shrink-0 opacity-70 group-hover/cmditem:opacity-100 transition-opacity">
                        ({option.equipmentCount})
                      </span>
                    )}
                  </div>

                  {allowDelete && onDeleteOption && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover/cmditem:opacity-100 shrink-0 transition-opacity ml-1 mr-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOption(option.value, option.label, option.equipmentCount);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Create option - appears at bottom when typing new value */}
          {showCreateOption && (
            <div className="border-t p-1.5 bg-muted/20">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-8 font-normal text-primary hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create "{search.trim()}"
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
