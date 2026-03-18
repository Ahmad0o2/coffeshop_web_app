import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "./Icons";

export default function SelectMenu({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  label,
  className,
  buttonClassName,
  menuClassName,
  disabled = false,
  renderValue,
  renderOption,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handler = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label && <p className="text-xs font-semibold text-cocoa/70">{label}</p>}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          "select-field flex items-center justify-between gap-2",
          disabled ? "cursor-not-allowed opacity-60" : "",
          label ? "mt-2" : "",
          buttonClassName,
        )}
        disabled={disabled}
      >
        <span className={selected ? "text-espresso" : "text-cocoa/70"}>
          {selected
            ? renderValue
              ? renderValue(selected)
              : selected.label
            : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-[80] mt-2 w-full rounded-xl2 border border-gold/20 bg-obsidian p-2 text-sm shadow-2xl",
            menuClassName,
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl2 px-3 py-2 text-left transition hover:bg-obsidian/70 ${
                option.value === value ? "text-gold" : "text-espresso"
              }`}
            >
              {renderOption ? renderOption(option) : option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
