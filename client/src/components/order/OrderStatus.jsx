const steps = ["Received", "InProgress", "Ready", "Completed"];

export default function OrderStatus({ status }) {
  const currentIndex = steps.indexOf(status);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-xs text-cocoa/60 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                index <= safeIndex ? "bg-gold" : "bg-obsidian/40"
              }`}
            />
            <span className={index <= safeIndex ? "text-espresso" : ""}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <span className="mx-2 hidden h-px w-6 bg-gold/30 sm:inline-block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
