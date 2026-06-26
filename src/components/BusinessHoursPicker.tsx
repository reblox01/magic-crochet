import { useState } from "react";

export type DaySchedule = {
  enabled: boolean;
  open: string;
  close: string;
};

export type BusinessHours = Record<string, DaySchedule>;

const DAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

const DEFAULT_DAY: DaySchedule = { enabled: false, open: "09:00", close: "18:00" };

export function getDefaultHours(): BusinessHours {
  const hours: BusinessHours = {};
  for (const d of DAYS) {
    hours[d.key] = d.key === "sunday"
      ? { ...DEFAULT_DAY }
      : { enabled: true, open: "09:00", close: "18:00" };
  }
  return hours;
}

export function parseBusinessHours(raw: string | BusinessHours | null | undefined): BusinessHours {
  if (!raw) return getDefaultHours();
  if (typeof raw === "object") {
    const result = getDefaultHours();
    for (const [k, v] of Object.entries(raw)) {
      if (result[k] && typeof v === "object" && v !== null) {
        result[k] = v as DaySchedule;
      }
    }
    return result;
  }
  return getDefaultHours();
}

function formatTimeLabel(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return `${h}h${m !== "00" ? m : ""}`;
}

export function formatHoursSummary(hours: BusinessHours): string {
  const openDays = DAYS.filter((d) => hours[d.key]?.enabled);
  if (openDays.length === 0) return "Fermé";
  if (openDays.length === 7) {
    const sameTime = openDays.every(
      (d) => hours[d.key].open === hours[openDays[0].key].open && hours[d.key].close === hours[openDays[0].key].close
    );
    if (sameTime) {
      return `Tous les jours: ${formatTimeLabel(hours[openDays[0].key].open)}–${formatTimeLabel(hours[openDays[0].key].close)}`;
    }
  }
  return openDays
    .map((d) => `${d.label.slice(0, 3)}. ${formatTimeLabel(hours[d.key].open)}–${formatTimeLabel(hours[d.key].close)}`)
    .join(", ");
}

interface BusinessHoursPickerProps {
  value: BusinessHours;
  onChange: (v: BusinessHours) => void;
}

export function BusinessHoursPicker({ value, onChange }: BusinessHoursPickerProps) {
  function updateDay(key: string, patch: Partial<DaySchedule>) {
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  }

  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const schedule = value[day.key] ?? DEFAULT_DAY;
        return (
          <div
            key={day.key}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              schedule.enabled
                ? "bg-white border-[#1c1917]/10"
                : "bg-[#f3f0ec]/40 border-[#1c1917]/5"
            }`}
          >
            <button
              type="button"
              onClick={() => updateDay(day.key, { enabled: !schedule.enabled })}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 overflow-hidden shrink-0 ${
                schedule.enabled ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
              }`}
            >
              <span
                className={`absolute top-[2px] left-0 size-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${
                  schedule.enabled ? "translate-x-[18px]" : "translate-x-[2px]"
                }`}
              />
            </button>
            <span className={`text-sm font-medium w-24 shrink-0 ${schedule.enabled ? "text-[#1c1917]" : "text-[#1c1917]/40"}`}>
              {day.label}
            </span>
            {schedule.enabled ? (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="time"
                  value={schedule.open}
                  onChange={(e) => updateDay(day.key, { open: e.target.value })}
                  className="rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-1.5 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
                />
                <span className="text-[#1c1917]/30 text-sm">–</span>
                <input
                  type="time"
                  value={schedule.close}
                  onChange={(e) => updateDay(day.key, { close: e.target.value })}
                  className="rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-1.5 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
                />
              </div>
            ) : (
              <span className="ml-auto text-xs text-[#1c1917]/30">Fermé</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
