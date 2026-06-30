import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, ChevronDown, Check } from "lucide-react";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateString(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function InlineTimeSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement!.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-14 h-7 rounded-lg border border-[#1c1917]/10 px-2 text-xs bg-white text-[#1c1917] flex items-center justify-between hover:border-[#F506EA]/50 transition-colors"
      >
        <span>{value}</span>
        <ChevronDown className="w-3 h-3 text-[#1c1917]/40" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-14 max-h-40 overflow-y-auto rounded-lg border border-[#1c1917]/10 bg-white shadow-md z-[9999]">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-2 py-1.5 text-xs flex items-center justify-between hover:bg-[#F506EA]/5 transition-colors
                ${opt === value ? "text-[#F506EA] font-medium" : "text-[#1c1917]"}`}
            >
              {opt}
              {opt === value && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function usePopupPosition(triggerRef: React.RefObject<HTMLButtonElement | null>, open: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0, above: false });

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const above = spaceBelow < dropdownHeight + 8 && spaceAbove > spaceBelow;
    setPos({
      top: above ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 300),
      above,
    });
  }, [open, triggerRef]);

  return pos;
}

// ── DatePicker ──────────────────────────────────────────────────

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  min?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Choisir une date", min, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pos = usePopupPosition(triggerRef, open);

  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear());

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Element;
      if (wrapperRef.current?.contains(t)) return;
      if (t.closest?.("[data-picker-dropdown]")) return;
      close();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  useEffect(() => {
    if (parsed) {
      setViewMonth(parsed.getMonth());
      setViewYear(parsed.getFullYear());
    }
  }, [value]);

  const today = toDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const days = getMonthDays(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(d: number) {
    const key = toDateString(viewYear, viewMonth, d);
    if (min && key < min) return;
    onChange(key);
    setOpen(false);
  }

  const display = parsed
    ? parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm text-left focus:outline-none focus:border-[#F506EA] transition-colors"
      >
        {display || <span className="text-[#1c1917]/30">{placeholder}</span>}
      </button>

      {open && createPortal(
        <div
          data-picker-dropdown
          className="fixed z-[9999] pointer-events-auto w-[280px] bg-white rounded-2xl border border-[#1c1917]/10 shadow-lg p-3"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/60">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-[#1c1917]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/60">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-[#1c1917]/30 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} />;
              const key = toDateString(viewYear, viewMonth, day);
              const isSelected = key === value;
              const isToday = key === today;
              const isDisabled = min ? key < min : false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={isDisabled}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-colors
                    ${isSelected ? "bg-[#F506EA] text-white" : isToday ? "bg-[#F506EA]/10 text-[#F506EA]" : "text-[#1c1917] hover:bg-[#1c1917]/5"}
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="mt-2 w-full text-center text-xs text-[#1c1917]/40 hover:text-[#F506EA] transition-colors py-1"
            >
              Effacer
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── DateTimePicker ──────────────────────────────────────────────

interface DateTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  min?: string;
  className?: string;
  presets?: { label: string; minutes: number }[];
}

export function DateTimePicker({ value, onChange, placeholder = "Choisir date & heure", min, className, presets }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pos = usePopupPosition(triggerRef, open);

  const parsed = value ? new Date(value) : null;
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear());
  const [timeHour, setTimeHour] = useState(parsed ? pad(parsed.getHours()) : "00");
  const [timeMin, setTimeMin] = useState(parsed ? pad(parsed.getMinutes()) : "00");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Element;
      if (wrapperRef.current?.contains(t)) return;
      if (t.closest?.("[data-picker-dropdown]")) return;
      close();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  useEffect(() => {
    if (parsed) {
      setViewMonth(parsed.getMonth());
      setViewYear(parsed.getFullYear());
      setTimeHour(pad(parsed.getHours()));
      setTimeMin(pad(parsed.getMinutes()));
    }
  }, [value]);

  const today = toDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const days = getMonthDays(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function commitDate(d: number) {
    const dateStr = toDateString(viewYear, viewMonth, d);
    if (min && dateStr + "T" + timeHour + ":" + timeMin < min) return;
    onChange(`${dateStr}T${timeHour}:${timeMin}`);
    setOpen(false);
  }

  function commitTime(h: string, m: string) {
    if (!parsed) return;
    const dateStr = toDateString(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    onChange(`${dateStr}T${h}:${m}`);
  }

  function addDuration(minutes: number) {
    const base = parsed ?? new Date();
    base.setMinutes(base.getMinutes() + minutes);
    const iso = `${toDateString(base.getFullYear(), base.getMonth(), base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
    onChange(iso);
    setOpen(false);
  }

  const display = parsed
    ? parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
      " " + parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm text-left focus:outline-none focus:border-[#F506EA] transition-colors flex items-center gap-2"
      >
        <Clock className="w-3.5 h-3.5 text-[#1c1917]/30 shrink-0" />
        {display || <span className="text-[#1c1917]/30">{placeholder}</span>}
      </button>

      {open && createPortal(
        <div
          data-picker-dropdown
          className="fixed z-[9999] pointer-events-auto w-[300px] bg-white rounded-2xl border border-[#1c1917]/10 shadow-lg p-3"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/60">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-[#1c1917]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/60">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-[#1c1917]/30 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} />;
              const key = toDateString(viewYear, viewMonth, day);
              const isSelected = parsed && key === toDateString(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
              const isToday = key === today;
              const isDisabled = min ? key + "T" + timeHour + ":" + timeMin < min : false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => commitDate(day)}
                  disabled={isDisabled}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-colors
                    ${isSelected ? "bg-[#F506EA] text-white" : isToday ? "bg-[#F506EA]/10 text-[#F506EA]" : "text-[#1c1917] hover:bg-[#1c1917]/5"}
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[#1c1917]/5">
            <Clock className="w-3.5 h-3.5 text-[#1c1917]/30" />
            <InlineTimeSelect
              value={timeHour}
              options={Array.from({ length: 24 }, (_, i) => pad(i))}
              onChange={(v) => { setTimeHour(v); if (parsed) commitTime(v, timeMin); }}
            />
            <span className="text-xs text-[#1c1917]/30">:</span>
            <InlineTimeSelect
              value={timeMin}
              options={Array.from({ length: 12 }, (_, i) => pad(i * 5))}
              onChange={(v) => { setTimeMin(v); if (parsed) commitTime(timeHour, v); }}
            />
          </div>
          {presets && presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#1c1917]/5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addDuration(p.minutes)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#1c1917]/10 text-[#1c1917]/50 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors"
                >
                  +{p.label}
                </button>
              ))}
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="mt-2 w-full text-center text-xs text-[#1c1917]/40 hover:text-[#F506EA] transition-colors py-1"
            >
              Effacer
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
