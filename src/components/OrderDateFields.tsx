"use client";

import {
  combineFittingDateTime,
  dismissPickerAfterChange,
} from "@/lib/orderFormDates";

const defaultInputClass =
  "mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900";

export function OrderDateFields({
  orderedAt,
  fittedDate,
  fittedTime,
  onOrderedAtChange,
  onFittedDateChange,
  onFittedTimeChange,
  inputClassName = defaultInputClass,
  idPrefix = "order",
}: {
  orderedAt: string;
  fittedDate: string;
  fittedTime: string;
  onOrderedAtChange: (value: string) => void;
  onFittedDateChange: (value: string) => void;
  onFittedTimeChange: (value: string) => void;
  inputClassName?: string;
  idPrefix?: string;
}) {
  const enteredId = `${idPrefix}-entered-date`;
  const fittingDateId = `${idPrefix}-fitting-date`;
  const fittingTimeId = `${idPrefix}-fitting-time`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="block text-xs">
        <label htmlFor={enteredId} className="text-violet-700 dark:text-slate-400">
          Entered
        </label>
        <input
          id={enteredId}
          type="date"
          value={orderedAt}
          onChange={(e) =>
            dismissPickerAfterChange(e, onOrderedAtChange)
          }
          className={inputClassName}
        />
      </div>
      <div className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Fitting</span>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <input
            id={fittingDateId}
            type="date"
            value={fittedDate}
            onChange={(e) =>
              dismissPickerAfterChange(e, onFittedDateChange)
            }
            aria-label="Fitting date"
            className={inputClassName}
          />
          <input
            id={fittingTimeId}
            type="time"
            value={fittedTime}
            onChange={(e) =>
              dismissPickerAfterChange(e, onFittedTimeChange)
            }
            disabled={!fittedDate}
            aria-label="Fitting time"
            className={`${inputClassName} disabled:opacity-50`}
          />
        </div>
      </div>
    </div>
  );
}

export { combineFittingDateTime };
