import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { getDisplayPrice, normalizeSizePrices } from "../../utils/pricing";
import {
  canOrderProduct,
  getInventoryQuantity,
  getInventoryStatusLabel,
  isProductLowStock,
} from "../../utils/inventory";

export default function ProductCard({ product, onAdd }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAvailable = canOrderProduct(product);
  const inventoryQuantity = getInventoryQuantity(product);
  const isLowStock = isProductLowStock(product);
  const { price, isFrom } = getDisplayPrice(product);
  const sizePrices = normalizeSizePrices(product);
  const defaultSize =
    sizePrices.find((entry) => entry.size === "Regular")?.size ||
    sizePrices[0]?.size ||
    "";
  const productPath = `/menu/${product._id}`;
  const navigationState = { from: location.pathname };

  const handleCardClick = (event) => {
    if (event.target.closest("button")) return;
    navigate(productPath, { state: navigationState });
  };

  const handleCardKeyDown = (event) => {
    if (event.target.closest("button")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(productPath, { state: navigationState });
    }
  };

  return (
    <div
      className="group card relative flex h-full cursor-pointer flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-cardHover"
      role="link"
      tabIndex={0}
      aria-label={`Open ${product.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="pointer-events-none absolute inset-0 bg-obsidian/40 opacity-0 transition group-hover:opacity-100" />
      <div className="relative z-10">
        <div className="relative h-44 overflow-hidden bg-obsidian">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 block h-full w-full object-cover transition duration-500 will-change-transform transform-gpu scale-[1.02] group-hover:scale-105"
            />
          ) : (
            <div className="h-44 w-full bg-gradient-to-br from-obsidian via-espresso to-caramel" />
          )}
          <div className="absolute -inset-9 bg-gradient-to-t from-obsidian/70 via-obsidian/10 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="pill bg-obsidian/80">
              {product.categoryName || "Coffee"}
            </span>
            {!isAvailable && (
              <span className="pill bg-obsidian/80">
                {getInventoryStatusLabel(product)}
              </span>
            )}
            {isAvailable && isLowStock && inventoryQuantity !== null && (
              <span className="pill bg-obsidian/80">
                Only {inventoryQuantity} left
              </span>
            )}
          </div>
          <div className="absolute bottom-4 left-4 rounded-full bg-obsidian/70 px-3 py-1 text-xs font-semibold text-cream">
            {isFrom ? "From " : ""}
            {price?.toFixed ? price.toFixed(2) : price} JD
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="block text-lg font-semibold text-espresso">
            {product.name}
          </h3>
          <p className="text-sm text-cocoa/70">{product.description}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              onAdd(product, {
                selectedSize: defaultSize,
                selectedAddOns: [],
              });
            }}
            disabled={!isAuthenticated || !isAvailable}
            className={`mt-auto w-full ${
              !isAuthenticated || !isAvailable
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
          >
            {!isAvailable
              ? getInventoryStatusLabel(product)
              : isAuthenticated
                ? "Add to cart"
                : "Sign in to order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
