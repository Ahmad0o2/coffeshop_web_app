export default function CartSummary({ total }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-sm text-cocoa/70">
        <span>Subtotal</span>
        <span>{total.toFixed(2)} JD</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-cocoa/70">
        <span>Tax</span>
        <span>0.00 JD</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-base font-semibold text-espresso">
        <span>Total</span>
        <span>{total.toFixed(2)} JD</span>
      </div>
    </div>
  )
}
