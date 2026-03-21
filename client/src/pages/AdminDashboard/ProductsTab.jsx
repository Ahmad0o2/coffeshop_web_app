import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import SelectMenu from "../../components/common/SelectMenu";
import { getApiErrorMessage } from "../../utils/apiErrors";
import {
  getInventoryStatusLabel,
  isProductLowStock,
  isProductOutOfStock,
} from "../../utils/inventory";
import { cn } from "../../lib/utils";
import { sizeOptions } from "./shared.js";
import { DashboardSectionHeading } from "./components.jsx";

const emptyCategoryForm = {
  id: "",
  name: "",
  description: "",
};

const createEmptyProductForm = () => ({
  id: "",
  name: "",
  categoryId: "",
  description: "",
  imageUrl: "",
  sizePrices: [],
  addOns: [],
  isAvailable: true,
  inventoryQuantity: "",
  lowStockThreshold: "5",
});

const normalizeSizePrices = (product) => {
  if (product.sizePrices?.length) return product.sizePrices;
  if (product.sizeOptions?.length && Number.isFinite(product.price)) {
    return product.sizeOptions.map((size) => ({
      size,
      price: product.price,
    }));
  }
  if (Number.isFinite(product.price)) {
    return [{ size: "Regular", price: product.price }];
  }
  return [];
};

export default function ProductsTab({
  products,
  categories,
  refetchProducts,
  refetchCategories,
  dashboardPanelClass,
  dashboardCompactItemClass,
  trackedInventoryProductsCount,
  lowStockProductsCount,
  outOfStockProductsCount,
  editProductId,
  onClearEditProduct,
}) {
  const [form, setForm] = useState(createEmptyProductForm);
  const [addOnDraft, setAddOnDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category._id, category.name])),
    [categories],
  );

  const resetFileInput = (event) => {
    if (event?.target) {
      event.target.value = "";
    }
  };

  const resetForm = () => {
    setForm(createEmptyProductForm());
    setImageFile(null);
    setImagePreview("");
    setAddOnDraft("");
    onClearEditProduct?.();
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm);
  };

  const handleEdit = (product) => {
    setForm({
      id: product._id,
      name: product.name,
      categoryId: product.categoryId,
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      sizePrices: normalizeSizePrices(product),
      addOns: product.addOns || [],
      isAvailable: product.isAvailable ?? true,
      inventoryQuantity:
        product.inventoryQuantity === null ||
        product.inventoryQuantity === undefined
          ? ""
          : String(product.inventoryQuantity),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
    });
    setImageFile(null);
    setImagePreview(product.imageUrl || "");
    setAddOnDraft("");
  };

  useEffect(() => {
    if (!editProductId) return;
    const product = products.find((item) => item._id === editProductId);
    if (product) {
      handleEdit(product);
    }
  }, [editProductId, products]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.name.trim()) {
        setError("Product name is required.");
        return;
      }

      const normalizedSizes = form.sizePrices
        .map((entry) => ({
          size: entry.size,
          price: Number(entry.price),
        }))
        .filter(
          (entry) =>
            entry.size && Number.isFinite(entry.price) && entry.price > 0,
        );

      if (normalizedSizes.length === 0) {
        setError("Select at least one size and price.");
        return;
      }

      if (!form.categoryId) {
        setError("Select a category.");
        return;
      }

      const basePrice = Math.min(...normalizedSizes.map((entry) => entry.price));
      const addOnsList = [...form.addOns, addOnDraft ? addOnDraft.trim() : ""]
        .map((item) => item.trim())
        .filter(Boolean);
      const normalizedAddOns = Array.from(new Set(addOnsList));

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("categoryId", form.categoryId);
      formData.append("description", form.description);
      formData.append("price", String(basePrice));
      formData.append("sizePrices", JSON.stringify(normalizedSizes));
      formData.append("addOns", JSON.stringify(normalizedAddOns));
      formData.append("isAvailable", String(form.isAvailable));
      formData.append("inventoryQuantity", form.inventoryQuantity);
      formData.append("lowStockThreshold", form.lowStockThreshold || "5");
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (form.id) {
        await api.put(`/admin/products/${form.id}`, formData);
      } else {
        await api.post("/admin/products", formData);
      }

      resetForm();
      await refetchProducts();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save product."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    await api.delete(`/admin/products/${productId}`);
    if (form.id === productId) {
      resetForm();
    }
    await refetchProducts();
  };

  const handleCategorySave = async () => {
    setCategorySaving(true);
    setCategoryError("");

    try {
      if (!categoryForm.name.trim()) {
        setCategoryError("Category name is required.");
        return;
      }

      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
      };

      if (categoryForm.id) {
        await api.put(`/admin/categories/${categoryForm.id}`, payload);
      } else {
        await api.post("/admin/categories", payload);
      }

      resetCategoryForm();
      await refetchCategories();
    } catch (err) {
      setCategoryError(getApiErrorMessage(err, "Failed to save category."));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleCategoryDelete = async (categoryId) => {
    setCategoryError("");
    try {
      await api.delete(`/admin/categories/${categoryId}`);
      if (categoryForm.id === categoryId) {
        resetCategoryForm();
      }
      await refetchCategories();
    } catch (err) {
      setCategoryError(getApiErrorMessage(err, "Failed to delete category."));
    }
  };

  const handleAddOnAdd = () => {
    const value = addOnDraft.trim();
    if (!value) return;

    setForm((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(value) ? prev.addOns : [...prev.addOns, value],
    }));
    setAddOnDraft("");
  };

  const handleAddOnRemove = (value) => {
    setForm((prev) => ({
      ...prev,
      addOns: prev.addOns.filter((item) => item !== value),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form noValidate onSubmit={handleSubmit} className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Catalog Editor"
          title={form.id ? "Edit Product" : "Add Product"}
          description="Maintain menu items, pricing tiers, availability, and imagery from one workspace."
        />
        <div className="mt-5 space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <SelectMenu
              value={form.categoryId}
              onChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}
              placeholder="Select category"
              options={categories.map((category) => ({
                label: category.name,
                value: category._id,
              }))}
            />
          </div>

          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows="3"
          />

          <div className="space-y-3">
            <p className="text-xs font-semibold text-cocoa/70">Sizes & Pricing</p>
            <div className="grid gap-3">
              {sizeOptions.map((size) => {
                const entry = form.sizePrices.find((item) => item.size === size);
                return (
                  <div
                    key={size}
                    className="flex flex-wrap items-center gap-3 rounded-xl2 border border-gold/20 bg-obsidian/60 px-3 py-2"
                  >
                    <label className="flex items-center gap-2 text-xs text-cocoa/70">
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={!!entry}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm((prev) => ({
                              ...prev,
                              sizePrices: [...prev.sizePrices, { size, price: "" }],
                            }));
                            return;
                          }
                          setForm((prev) => ({
                            ...prev,
                            sizePrices: prev.sizePrices.filter((item) => item.size !== size),
                          }));
                        }}
                      />
                      {size}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price (JD)"
                      value={entry?.price ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          sizePrices: prev.sizePrices.map((item) =>
                            item.size === size ? { ...item, price: value } : item,
                          ),
                        }));
                      }}
                      disabled={!entry}
                      className="w-40"
                    />
                  </div>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-xs text-cocoa/70">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
                className="accent-gold"
              />
              Available
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-cocoa/70">Inventory Count</p>
                <Input
                  type="number"
                  min="0"
                  placeholder="Leave empty for open inventory"
                  value={form.inventoryQuantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, inventoryQuantity: e.target.value }))
                  }
                />
                <p className="text-[11px] text-cocoa/60">
                  When left empty, this product stays orderable without stock tracking.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-cocoa/70">Low Stock Warning</p>
                <Input
                  type="number"
                  min="0"
                  placeholder="5"
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))
                  }
                />
                <p className="text-[11px] text-cocoa/60">
                  Show a low-stock state once the count reaches this number.
                </p>
              </div>
            </div>
          </div>

          <div className="upload-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-espresso">Product Image</p>
                <p className="text-xs text-cocoa/60">PNG/JPG up to 2MB</p>
              </div>
              <label className="upload-button">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImageFile(file);
                    setImagePreview(file ? URL.createObjectURL(file) : form.imageUrl);
                    resetFileInput(e);
                  }}
                />
                Upload Image
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
              {imagePreview || form.imageUrl ? (
                <img
                  src={imagePreview || form.imageUrl}
                  alt="Preview"
                  className="h-24 w-24 rounded-xl2 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream text-xs text-cream">
                  No Image
                </div>
              )}
              <div className="text-xs text-cocoa/60">
                {imageFile ? imageFile.name : "No file selected yet."}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-cocoa/70">Add-ons</p>
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                placeholder="Add-on name"
                value={addOnDraft}
                onChange={(e) => setAddOnDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOnAdd();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddOnAdd}
                className="h-10 w-10 rounded-full p-0 text-lg"
              >
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.addOns.map((addOn) => (
                <span key={addOn} className="chip">
                  {addOn}
                  <button
                    type="button"
                    className="ml-2 text-xs text-cocoa/60 hover:text-cream"
                    onClick={() => handleAddOnRemove(addOn)}
                  >
                    x
                  </button>
                </span>
              ))}
              {form.addOns.length === 0 && (
                <span className="text-xs text-cocoa/60">No add-ons added.</span>
              )}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1 justify-center" disabled={saving}>
              {saving ? "Saving..." : form.id ? "Update" : "Create"}
            </Button>
            {form.id && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className="space-y-6">
        <div className={dashboardPanelClass}>
          <DashboardSectionHeading
            eyebrow="Catalog Structure"
            title="Categories"
            description="Add, edit, or remove the groups that organize your menu."
          />
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                placeholder="Category name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCategorySave();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCategorySave}
                disabled={categorySaving}
                className={cn(
                  categoryForm.id ? "h-10 rounded-full px-4" : "h-10 w-10 rounded-full p-0 text-lg",
                )}
              >
                {categoryForm.id ? "Save" : "+"}
              </Button>
              {categoryForm.id && (
                <Button type="button" variant="outline" onClick={resetCategoryForm}>
                  Cancel
                </Button>
              )}
            </div>
            <Input
              type="text"
              placeholder="Category description (optional)"
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <div className="grid gap-3">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className={cn(
                    dashboardCompactItemClass,
                    "flex flex-wrap items-center justify-between gap-3",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-espresso">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-cocoa/60">{category.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setCategoryForm({
                        id: category._id,
                        name: category.name || "",
                        description: category.description || "",
                      })}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCategoryDelete(category._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {categoryError && <p className="form-error">{categoryError}</p>}
          </div>
        </div>

        <div className={dashboardPanelClass}>
          <DashboardSectionHeading
            eyebrow="Menu Library"
            title="Products"
            description={`${products.length} items currently available for editing.`}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{trackedInventoryProductsCount} tracked</Badge>
            <Badge>{lowStockProductsCount} low stock</Badge>
            <Badge>{outOfStockProductsCount} out of stock</Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {products.map((product) => (
              <div
                key={product._id}
                className={cn(
                  dashboardCompactItemClass,
                  "flex flex-wrap items-center justify-between gap-4",
                )}
              >
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-12 w-12 rounded-xl2 object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                  )}
                  <div>
                    <p className="font-semibold text-espresso">{product.name}</p>
                    <p className="text-xs text-cocoa/60">
                      {categoryMap.get(product.categoryId) || "Category"} - {" "}
                      {product.sizePrices?.length
                        ? `From ${Math.min(...product.sizePrices.map((entry) => entry.price)).toFixed(2)} JD`
                        : `${product.price} JD`}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[11px] font-medium",
                        isProductOutOfStock(product)
                          ? "text-rose-600"
                          : isProductLowStock(product)
                            ? "text-amber-600"
                            : "text-cocoa/65",
                      )}
                    >
                      {getInventoryStatusLabel(product)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => handleEdit(product)}>
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => handleDelete(product._id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-cocoa/60">No products yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
