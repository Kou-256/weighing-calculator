"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button as AriaButton, Calendar, Dialog, DialogTrigger, Popover, useLocale } from "react-aria-components";
import type { CalendarDate } from "@internationalized/date";
import { RiCalendarLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";
import { DateChipInput, MonthPanel, formatTriggerDate, popoverClassName, triggerButtonClassName } from "./shared";
import { cx } from "@/utils/cx";
import { useDismissOnOutsidePress } from "@/utils/use-dismiss-on-outside-press";

export interface DatePickerProps {
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onChange?: (value: CalendarDate | null) => void;
  isDisabled?: boolean;
  className?: string;
  "aria-label"?: string;
  triggerRef?: RefObject<HTMLElement | null>;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/** BoardUI's source-owned single-date picker. The normal trigger uses React
 * Aria's DialogTrigger so touch, keyboard, focus and dismissal share one press
 * lifecycle. This avoids the standalone native click/outside-press race. */
export function DatePicker({ value, defaultValue = null, onChange, isDisabled, className,
  "aria-label": ariaLabel = "Date", triggerRef: externalTriggerRef,
  isOpen: controlledOpen, onOpenChange: controlledOpenChange }: DatePickerProps) {
  const localize = useTemplateCopy();
  const { locale } = useLocale();
  const ownTriggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const triggerRef = externalTriggerRef ?? ownTriggerRef;
  const isExternal = externalTriggerRef !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isExternal ? (controlledOpen ?? false) : internalOpen;
  const [internalValue, setInternalValue] = useState<CalendarDate | null>(defaultValue);
  const committedValue = value !== undefined ? value : internalValue;
  const [pendingValue, setPendingValue] = useState<CalendarDate | null>(committedValue);
  const [openKey, setOpenKey] = useState(0);

  const changeOpen = (open: boolean) => {
    if (open) { setPendingValue(committedValue); setOpenKey(key => key + 1); }
    if (isExternal) controlledOpenChange?.(open);
    else setInternalOpen(open);
  };
  useEffect(() => {
    if (isExternal && isOpen) { setPendingValue(committedValue); setOpenKey(key => key + 1); }
    // An external trigger may change the month between openings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExternal, isOpen]);
  useDismissOnOutsidePress(isExternal && isOpen, () => controlledOpenChange?.(false), [triggerRef, popoverRef]);

  const commit = () => {
    if (value === undefined) setInternalValue(pendingValue);
    onChange?.(pendingValue);
    changeOpen(false);
  };
  const popover = <Popover ref={popoverRef} triggerRef={triggerRef} isOpen={isOpen} onOpenChange={changeOpen}
    offset={4} placement="bottom end" isNonModal={isExternal}
    className={cx(popoverClassName, "nb-calendar-popover")}>
    <Dialog aria-label={ariaLabel} className="outline-none">
      <Calendar key={openKey} aria-label={ariaLabel} value={pendingValue} onChange={setPendingValue}>
        <div className="flex flex-col p-2 pb-3">
          <MonthPanel offset={0} showPrev showNext />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
            {pendingValue && <DateChipInput date={pendingValue} label="Date" onCommit={setPendingValue} dateOrder={locale.startsWith('ja') ? 'ymd' : 'dmy'} />}
            <div className="ms-auto flex items-center gap-2">
              <Button variant="secondary" onClick={() => changeOpen(false)}>Cancel</Button>
              <Button onClick={commit} disabled={!pendingValue}>Apply</Button>
            </div>
          </div>
        </div>
      </Calendar>
    </Dialog>
  </Popover>;

  return localize(isExternal ? popover : <DialogTrigger isOpen={isOpen} onOpenChange={changeOpen}>
    <AriaButton ref={ownTriggerRef} isDisabled={isDisabled} aria-label={ariaLabel}
      className={cx(triggerButtonClassName, className)}>
      <RiCalendarLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
      <span className="px-1 text-body-medium text-text-primary whitespace-nowrap">
        {committedValue ? formatTriggerDate(committedValue, locale) : "Select date"}
      </span>
    </AriaButton>
    {popover}
  </DialogTrigger>);
}
