// components/ui/searchable-select.tsx
"use client";

import * as React from "react";
import { Search } from "lucide-react";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  noneValue?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "انتخاب کنید...",
  emptyText = "موردی یافت نشد.",
  disabled = false,
  className,
  noneValue = "NONE",
}: SearchableSelectProps) {
  const selectableOptions = React.useMemo(
    () => options.filter((o) => o.value !== noneValue),
    [options, noneValue]
  );

  const selectedOption = React.useMemo(
    () => selectableOptions.find((o) => o.value === value) ?? null,
    [selectableOptions, value]
  );

  const customFilter = React.useCallback(
    (item: SearchableSelectOption, query: string) => {
      const normalizedQuery = normalizePersianDigits(query)
        .trim()
        .toLowerCase();
      if (!normalizedQuery) return true;
      const normalizedLabel = normalizePersianDigits(item.label).toLowerCase();
      return normalizedLabel.includes(normalizedQuery);
    },
    []
  );

  return (
    <Combobox
      items={selectableOptions}
      value={selectedOption}
      disabled={disabled}
      filter={customFilter}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      onValueChange={(next) => {
        onValueChange(next ? next.value : noneValue);
      }}
    >
      <ComboboxInputGroup className={cn("h-9", className)}>
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <ComboboxInput
          placeholder={selectedOption ? selectedOption.label : placeholder}
          disabled={disabled}
        />
        {selectedOption && !disabled && <ComboboxClear />}
        <ComboboxIcon />
      </ComboboxInputGroup>

      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchableSelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}