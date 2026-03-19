import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  menuPlacement = "bottom",
  portal = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const selected = options.find((option) => option.value === value);

  const syncMenuPosition = useCallback(() => {
    if (!portal || !buttonRef.current || typeof window === "undefined") return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - width - 8),
    );
    const top =
      menuPlacement === "top" ? Math.max(8, rect.top - 8) : rect.bottom + 8;

    setMenuPosition({
      top,
      left,
      width,
    });
  }, [menuPlacement, portal]);

  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      const clickedInsideWrapper = wrapperRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);
      if (!clickedInsideWrapper && !clickedInsideMenu) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open || !portal || typeof window === "undefined") return undefined;

    syncMenuPosition();

    const handler = () => syncMenuPosition();

    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, portal, syncMenuPosition]);

  const menuContent = (
    <div
      ref={menuRef}
      className={cn(
        portal
          ? "fixed z-[120] max-h-[18rem] overflow-y-auto rounded-xl2 border border-gold/20 bg-obsidian p-2 text-sm shadow-2xl"
          : "absolute z-[80] w-full rounded-xl2 border border-gold/20 bg-obsidian p-2 text-sm shadow-2xl",
        !portal && (menuPlacement === "top" ? "bottom-full mb-2" : "top-full mt-2"),
        menuClassName,
      )}
      style={
        portal
          ? {
              top:
                menuPlacement === "top"
                  ? undefined
                  : `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              bottom:
                menuPlacement === "top"
                  ? `${Math.max(8, window.innerHeight - menuPosition.top)}px`
                  : undefined,
            }
          : undefined
      }
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
  );

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", open && "z-[90]", className)}
    >
      {label && <p className="text-xs font-semibold text-cocoa/70">{label}</p>}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          if (!open) {
            syncMenuPosition();
          }
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
      {open &&
        (portal && typeof document !== "undefined"
          ? createPortal(menuContent, document.body)
          : menuContent)}
    </div>
  );
}
