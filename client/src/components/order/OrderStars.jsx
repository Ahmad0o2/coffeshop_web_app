import { cn } from "../../lib/utils";

function StarShape({ filled, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className={cn("h-5 w-5 transition-colors", className)}
    >
      <path d="m12 3.8 2.6 5.27 5.82.84-4.21 4.1.99 5.79L12 17.05 6.8 19.8l.99-5.79-4.21-4.1 5.82-.84L12 3.8Z" />
    </svg>
  );
}

export default function OrderStars({
  value = 0,
  onChange,
  readOnly = false,
  className = "",
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        if (readOnly) {
          return (
            <span
              key={starValue}
              className={filled ? "text-gold" : "text-cocoa/35"}
              aria-hidden="true"
            >
              <StarShape filled={filled} />
            </span>
          );
        }

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange?.(starValue)}
            className={cn(
              "rounded-full p-1 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
              filled ? "text-gold" : "text-cocoa/35 hover:text-gold/75",
            )}
            aria-label={`Rate ${starValue} out of 5`}
          >
            <StarShape filled={filled} />
          </button>
        );
      })}
    </div>
  );
}
