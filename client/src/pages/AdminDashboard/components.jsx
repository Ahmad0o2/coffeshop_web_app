import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export function DashboardSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h2 className="text-lg font-semibold text-espresso">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-cocoa/60">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function DashboardStatCard({ label, value, note }) {
  return (
    <div className="flex h-full min-h-[7.75rem] w-full flex-col justify-between rounded-[1.4rem] border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)),rgba(15,11,10,0.88)] px-3.5 py-3 shadow-[0_16px_34px_rgba(16,10,8,0.11)] xl:w-[13.25rem]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cocoa/55">
        {label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[1.65rem] font-semibold tracking-tight text-espresso">
          {value}
        </p>
        {note ? (
          <p className="max-w-[6.6rem] text-right text-[11px] leading-4 text-cocoa/60">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DashboardNavIcon({ icon, active = false, isDayTheme = false }) {
  const iconClass = cn(
    "h-[1.05rem] w-[1.05rem]",
    isDayTheme
      ? active
        ? "text-[#315f5e]"
        : "text-cocoa/75"
      : active
        ? "text-espresso"
        : "text-cocoa/75",
  );

  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
      {icon === "orders" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      )}
      {icon === "products" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z" />
          <path d="M4 7.5V16l8 4 8-4V7.5" />
          <path d="M12 11v9" />
        </svg>
      )}
      {icon === "inventory" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <path d="M4 7.5h16" />
          <path d="M6 7.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1.5" />
          <rect x="4" y="7.5" width="16" height="12.5" rx="2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      )}
      {icon === "rewards" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <circle cx="12" cy="8" r="4" />
          <path d="M8.5 12.5 7 20l5-2.8L17 20l-1.5-7.5" />
        </svg>
      )}
      {icon === "brand" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 15l2.8-3 2.2 2.2 2.5-3 2.5 3.8" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      )}
      {icon === "gallery" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      )}
      {icon === "events" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M8 3v6M16 3v6M4 11h16" />
        </svg>
      )}
      {icon === "manage" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="8" r="2.2" />
          <path d="M4.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
          <path d="M14.5 18c.4-1.8 1.8-3 4-3 1.1 0 2 .3 2.9.9" />
        </svg>
      )}
    </span>
  );
}

export function DashboardUtilityIcon({ icon, className = "", isDayTheme = false }) {
  const iconClass = cn(
    "h-[1.05rem] w-[1.05rem]",
    isDayTheme ? "text-[#315f5e]" : "text-espresso",
    className,
  );

  if (icon === "workspace") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="5" rx="1.5" />
        <rect x="13" y="11" width="7" height="9" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (icon === "activity") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <path d="M4 14h3l2-5 4 9 2-4h5" />
        <path d="M4 6h16" opacity="0.35" />
      </svg>
    );
  }

  return null;
}

export function DashboardSidebarNavItems({
  dashboardTabs,
  activeTab,
  onTabSelect,
  isCompact = false,
  isAdmin = false,
  onActivityNavigate,
  isDayTheme = false,
}) {
  return (
    <div className="space-y-2">
      {dashboardTabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabSelect(tab.key)}
            className={cn(
              "group relative flex w-full items-center rounded-[1.35rem] border text-left transition-all",
              isCompact ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
              isDayTheme
                ? isActive
                  ? "border-[#3f7674]/28 bg-[#e7f2f1] shadow-[0_7px_18px_rgba(34,71,70,0.035)]"
                  : "border-[#3f7674]/12 bg-[rgba(248,252,252,0.92)] hover:border-[#3f7674]/20 hover:bg-[#eef6f5]"
                : isActive
                  ? "border-gold/45 bg-gold/14 shadow-[0_14px_32px_rgba(19,13,9,0.12)]"
                  : "border-gold/12 bg-obsidian/45 hover:border-gold/24 hover:bg-obsidian/55",
            )}
            title={tab.label}
          >
            {!isCompact && (
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
                  isActive
                    ? isDayTheme
                      ? "bg-[#315f5e] opacity-100"
                      : "bg-gold opacity-100"
                    : "opacity-0",
                )}
              />
            )}
            <DashboardNavIcon icon={tab.icon} active={isActive} isDayTheme={isDayTheme} />
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-espresso">{tab.label}</span>
                  <div className="flex items-center gap-2">
                    {tab.alertCount > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          tab.alertTone === "danger"
                            ? "border border-rose-200/80 bg-rose-50 text-rose-700"
                            : "border border-amber-200/80 bg-amber-50 text-amber-700",
                        )}
                      >
                        {tab.alertCount}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        isDayTheme
                          ? isActive
                            ? "bg-[#315f5e] text-[#f8fcfc]"
                            : "bg-[#deeeee] text-[#315f5e]"
                          : isActive
                            ? "bg-obsidian/80 text-cream"
                            : "bg-obsidian/70 text-cocoa/70",
                      )}
                    >
                      {tab.count}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-cocoa/58">{tab.caption}</p>
              </div>
            )}
            {isCompact && tab.alertCount > 0 && (
              <span
                className={cn(
                  "absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  tab.alertTone === "danger"
                    ? "bg-rose-500 text-white"
                    : "bg-amber-400 text-obsidian",
                )}
              >
                {tab.alertCount}
              </span>
            )}
          </button>
        );
      })}

      {isAdmin && (
        <Link
          to="/admin/activity"
          onClick={onActivityNavigate}
          className={cn(
            "group relative flex w-full items-center rounded-[1.35rem] border text-left transition-all",
            isDayTheme
              ? "border-[#3f7674]/12 bg-[rgba(248,252,252,0.92)] hover:border-[#3f7674]/20 hover:bg-[#eef6f5]"
              : "border-gold/12 bg-obsidian/45 hover:border-gold/24 hover:bg-obsidian/55",
            isCompact ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
          )}
          title="Activity Log"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <DashboardUtilityIcon icon="activity" isDayTheme={isDayTheme} />
          </span>
          {!isCompact && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-espresso">Activity Log</p>
              <p className="mt-1 text-[11px] leading-4 text-cocoa/58">
                Review system activity and operational changes.
              </p>
            </div>
          )}
        </Link>
      )}
    </div>
  );
}
