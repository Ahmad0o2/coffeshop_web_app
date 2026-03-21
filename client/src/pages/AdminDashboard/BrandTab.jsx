import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { resolveImageUrl } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { DashboardSectionHeading } from "./components.jsx";

const normalizeSizePrices = (product) => {
  if (product.sizePrices?.length) return product.sizePrices;
  if (product.sizeOptions?.length && Number.isFinite(product.price)) {
    return product.sizeOptions.map((size) => ({ size, price: product.price }));
  }
  if (Number.isFinite(product.price)) {
    return [{ size: "Regular", price: product.price }];
  }
  return [];
};

const formatAdminProductPrice = (product) => {
  const prices = normalizeSizePrices(product)
    .map((entry) => Number(entry.price))
    .filter((value) => Number.isFinite(value));

  if (!prices.length) return "Price not set";

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return `${minPrice.toFixed(2)} JD`;
  }

  return `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} JD`;
};

export default function BrandTab({
  mode = "brand",
  settings,
  refetchSettings,
  products,
  categories,
  dashboardCompactItemClass,
  dashboardItemClass,
  dashboardPanelClass,
  isDayTheme,
}) {
  const queryClient = useQueryClient();
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState("");
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [heroPreview, setHeroPreview] = useState("");
  const [clearBrand, setClearBrand] = useState({
    logo: false,
    hero: false,
    homeDisplay: false,
  });
  const [todaysSpecialId, setTodaysSpecialId] = useState("");
  const [featuredProductsSelection, setFeaturedProductsSelection] = useState([]);

  useEffect(() => {
    setTodaysSpecialId(settings?.todaysSpecialProductId || "");
    setFeaturedProductsSelection(settings?.featuredProductIds || []);
  }, [settings?.todaysSpecialProductId, settings?.featuredProductIds]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category._id, category.name])),
    [categories],
  );
  const productMap = useMemo(
    () => new Map(products.map((product) => [product._id, product])),
    [products],
  );
  const selectedTodaysSpecialProduct = useMemo(
    () => productMap.get(todaysSpecialId) || null,
    [productMap, todaysSpecialId],
  );
  const selectedFeaturedProducts = useMemo(
    () =>
      featuredProductsSelection
        .map((productId) => productMap.get(productId))
        .filter(Boolean),
    [featuredProductsSelection, productMap],
  );

  const logoDisplay = logoPreview || settings?.logoUrl;
  const heroDisplay = heroPreview || settings?.heroImageUrl;
  const homeDisplayGallery = settings?.homeDisplayUrls || [];
  const galleryDisplay = settings?.galleryUrls || [];

  const resetFileInput = (event) => {
    if (event?.target) {
      event.target.value = "";
    }
  };

  const resetBrand = () => {
    setLogoFile(null);
    setHeroFile(null);
    setLogoPreview("");
    setHeroPreview("");
    setTodaysSpecialId(settings?.todaysSpecialProductId || "");
    setFeaturedProductsSelection(settings?.featuredProductIds || []);
    setClearBrand({
      logo: false,
      hero: false,
      homeDisplay: false,
    });
  };

  const updateSettingsCache = (data) => {
    if (data?.settings) {
      queryClient.setQueryData(["settings"], data.settings);
    }
  };

  const handleBrandSubmit = async (event) => {
    event.preventDefault();
    setBrandSaving(true);
    setBrandError("");
    try {
      const formData = new FormData();
      if (clearBrand.logo) formData.append("clearLogo", "true");
      if (clearBrand.hero) formData.append("clearHero", "true");
      if (clearBrand.homeDisplay) formData.append("clearHomeDisplay", "true");
      if (logoFile) formData.append("logo", logoFile);
      if (heroFile) formData.append("heroImage", heroFile);
      const { data } = await api.put("/admin/settings", formData);
      updateSettingsCache(data);
      resetBrand();
      await refetchSettings();
    } catch (err) {
      setBrandError(err.response?.data?.message || "Failed to update brand.");
    } finally {
      setBrandSaving(false);
    }
  };

  const handleHomeDisplayReplace = async (index, file) => {
    if (!file) return;
    setBrandSaving(true);
    setBrandError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.put(`/admin/settings/home-display/${index}`, formData);
      updateSettingsCache(data);
      await refetchSettings();
    } catch (err) {
      setBrandError(err.response?.data?.message || "Failed to update image.");
    } finally {
      setBrandSaving(false);
    }
  };

  const handleHomeDisplayDelete = async (index) => {
    setBrandSaving(true);
    setBrandError("");
    try {
      const { data } = await api.delete(`/admin/settings/home-display/${index}`);
      updateSettingsCache(data);
      await refetchSettings();
    } catch (err) {
      setBrandError(err.response?.data?.message || "Failed to delete image.");
    } finally {
      setBrandSaving(false);
    }
  };

  const handleHomeDisplayAdd = async (file) => {
    if (!file) return;
    if (homeDisplayGallery.length >= 8) {
      setBrandError("Maximum 8 images allowed.");
      return;
    }
    await handleHomeDisplayReplace(homeDisplayGallery.length, file);
  };

  const handleGalleryReplace = async (index, file) => {
    if (!file) return;
    setGallerySaving(true);
    setGalleryError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.put(`/admin/settings/gallery/${index}`, formData);
      updateSettingsCache(data);
      await refetchSettings();
    } catch (err) {
      setGalleryError(err.response?.data?.message || "Failed to update image.");
    } finally {
      setGallerySaving(false);
    }
  };

  const handleGalleryDelete = async (index) => {
    setGallerySaving(true);
    setGalleryError("");
    try {
      const { data } = await api.delete(`/admin/settings/gallery/${index}`);
      updateSettingsCache(data);
      await refetchSettings();
    } catch (err) {
      setGalleryError(err.response?.data?.message || "Failed to delete image.");
    } finally {
      setGallerySaving(false);
    }
  };

  const handleGalleryAdd = async (file) => {
    if (!file) return;
    if (galleryDisplay.length >= 8) {
      setGalleryError("Maximum 8 images allowed.");
      return;
    }
    await handleGalleryReplace(galleryDisplay.length, file);
  };

  if (mode === "gallery") {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={dashboardPanelClass}>
          <DashboardSectionHeading
            eyebrow="Gallery Editor"
            title="Gallery Page Media"
            description="This section is separate from the Home page and controls only `/gallery`."
            action={
              <label className="upload-button">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleGalleryAdd(file);
                    }
                    resetFileInput(e);
                  }}
                />
                Add Image
              </label>
            }
          />

          {galleryError && <p className="form-error mt-4">{galleryError}</p>}

          <div className="mt-4 space-y-3">
            {galleryDisplay.length === 0 && (
              <div className="rounded-xl2 border border-dashed border-gold/20 bg-obsidian/40 p-4 text-sm text-cocoa/60">
                No gallery images yet.
              </div>
            )}
            {galleryDisplay.map((image, index) => (
              <div key={`${image}-${index}`} className={dashboardCompactItemClass}>
                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <div className="h-24 overflow-hidden rounded-xl2 border border-gold/10">
                    <img src={resolveImageUrl(image)} alt={`Gallery page ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="upload-button">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleGalleryReplace(index, file);
                          }
                          resetFileInput(e);
                        }}
                      />
                      Replace
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleGalleryDelete(index)}
                      disabled={gallerySaving}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={dashboardPanelClass}>
          <DashboardSectionHeading
            eyebrow="Preview"
            title="Gallery Preview"
            description="The page uses a masonry-style layout with variable card heights."
          />
          <div className="mt-5 grid auto-rows-[120px] gap-3 sm:grid-cols-2">
            {(galleryDisplay.length ? galleryDisplay : Array.from({ length: 4 })).map((image, index) => (
              <div
                key={image || index}
                className={`overflow-hidden rounded-xl2 border border-gold/15 bg-obsidian/50 ${
                  index % 3 === 0 ? "row-span-2" : "row-span-1"
                }`}
              >
                {image ? (
                  <img src={resolveImageUrl(image)} alt="Gallery preview" className="h-full w-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form noValidate onSubmit={handleBrandSubmit} className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Homepage Assets"
          title="Brand & Home Media"
          description="Update the logo, hero background, and homepage visuals without leaving the dashboard."
        />

        <div className="mt-5 space-y-4 text-sm">
          <div className="upload-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-espresso">Logo</p>
                <p className="text-xs text-cocoa/60">Square PNG/JPG up to 2MB.</p>
              </div>
              <label className="upload-button">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                    setLogoPreview(file ? URL.createObjectURL(file) : "");
                    setClearBrand((prev) => ({ ...prev, logo: false }));
                    resetFileInput(e);
                  }}
                />
                Upload Logo
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {logoDisplay ? (
                <img src={resolveImageUrl(logoDisplay)} alt="Logo preview" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-obsidian/60 text-xs text-cocoa/60">
                  No logo
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-cocoa/70">
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={clearBrand.logo}
                  onChange={(e) =>
                    setClearBrand((prev) => ({ ...prev, logo: e.target.checked }))
                  }
                />
                Clear logo
              </label>
            </div>
          </div>

          <div className="upload-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-espresso">Hero Image</p>
                <p className="text-xs text-cocoa/60">Wide photo for the Home background, up to 2MB.</p>
              </div>
              <label className="upload-button">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setHeroFile(file);
                    setHeroPreview(file ? URL.createObjectURL(file) : "");
                    setClearBrand((prev) => ({ ...prev, hero: false }));
                    resetFileInput(e);
                  }}
                />
                Upload Hero
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {heroDisplay ? (
                <img src={resolveImageUrl(heroDisplay)} alt="Hero preview" className="h-20 w-full max-w-xs rounded-xl2 object-cover" />
              ) : (
                <div className="flex h-20 w-full max-w-xs items-center justify-center rounded-xl2 bg-obsidian/60 text-xs text-cocoa/60">
                  No hero image
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-cocoa/70">
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={clearBrand.hero}
                  onChange={(e) =>
                    setClearBrand((prev) => ({ ...prev, hero: e.target.checked }))
                  }
                />
                Clear hero
              </label>
            </div>
          </div>

          <div className="upload-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-espresso">Homepage Showcase Images</p>
                <p className="text-xs text-cocoa/60">
                  Separate from the Gallery page. Upload up to 8 images that appear only in the Home showcase section.
                </p>
              </div>
              <label className="upload-button">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleHomeDisplayAdd(file);
                      setClearBrand((prev) => ({ ...prev, homeDisplay: false }));
                    }
                    resetFileInput(e);
                  }}
                />
                Add Image
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {homeDisplayGallery.map((image, index) => (
                <div key={`${image}-${index}`} className="rounded-xl2 border border-gold/20 bg-obsidian/60 p-2">
                  <div className="h-20 overflow-hidden rounded-xl2">
                    <img src={resolveImageUrl(image)} alt={`Home display ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="upload-button">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleHomeDisplayReplace(index, file);
                          }
                          resetFileInput(e);
                        }}
                      />
                      Replace
                    </label>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleHomeDisplayDelete(index)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {homeDisplayGallery.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-xl2 border border-dashed border-gold/30 bg-obsidian/50 text-xs text-cocoa/60">
                  No home display images yet.
                </div>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-cocoa/70">
              <input
                type="checkbox"
                className="accent-gold"
                checked={clearBrand.homeDisplay}
                onChange={(e) =>
                  setClearBrand((prev) => ({ ...prev, homeDisplay: e.target.checked }))
                }
              />
              Clear all home display images
            </label>
          </div>

          <div className="upload-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-espresso">Home Menu Highlights</p>
                <p className="text-xs text-cocoa/60">
                  Open the Menu picker and choose today&apos;s special or up to 6 popular picks directly from the live menu.
                </p>
              </div>
              <Button type="button" variant="secondary" asChild>
                <Link to="/menu?adminPicker=home-highlights">Open Menu Picker</Link>
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-3">
                <div
                  className={cn(
                    dashboardCompactItemClass,
                    "space-y-3",
                    isDayTheme ? "border-[#3f7674]/16 bg-[#f9fdfd]" : "",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                        Today&apos;s Special
                      </p>
                      <p className="mt-1 text-xs text-cocoa/60">
                        The first featured item visitors see on Home.
                      </p>
                    </div>
                    <Badge>Menu-managed</Badge>
                  </div>

                  {selectedTodaysSpecialProduct ? (
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-[1.15rem] border p-3",
                        isDayTheme ? "border-[#3f7674]/18 bg-[#eef7f6]" : "border-gold/14 bg-obsidian/50",
                      )}
                    >
                      {selectedTodaysSpecialProduct.imageUrl ? (
                        <img
                          src={resolveImageUrl(selectedTodaysSpecialProduct.imageUrl)}
                          alt={selectedTodaysSpecialProduct.name}
                          className="h-14 w-14 rounded-xl2 object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-espresso">{selectedTodaysSpecialProduct.name}</p>
                        <p className="mt-1 text-xs text-cocoa/60">
                          {categoryMap.get(selectedTodaysSpecialProduct.categoryId) || "Category"}
                        </p>
                        <p className="mt-2 text-xs font-medium text-cocoa/70">
                          {formatAdminProductPrice(selectedTodaysSpecialProduct)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-[1.15rem] border border-dashed px-4 py-5 text-xs text-cocoa/60",
                        isDayTheme ? "border-[#3f7674]/18 bg-[#f7fbfb]" : "border-gold/18 bg-obsidian/35",
                      )}
                    >
                      No special selected yet. Open the menu picker and choose one item.
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    dashboardCompactItemClass,
                    "space-y-3",
                    isDayTheme ? "border-[#3f7674]/16 bg-[#f9fdfd]" : "",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                        Popular Picks
                      </p>
                      <p className="mt-1 text-xs text-cocoa/60">
                        Visitors see these up to 6 picks inside the Home menu grid.
                      </p>
                    </div>
                    <Badge>{selectedFeaturedProducts.length}/6 selected</Badge>
                  </div>

                  {selectedFeaturedProducts.length ? (
                    <div className="space-y-2">
                      {selectedFeaturedProducts.map((product) => (
                        <div
                          key={product._id}
                          className={cn(
                            "flex items-center gap-3 rounded-[1.15rem] border p-3",
                            isDayTheme ? "border-[#3f7674]/18 bg-[#eef7f6]" : "border-gold/14 bg-obsidian/50",
                          )}
                        >
                          {product.imageUrl ? (
                            <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="h-11 w-11 rounded-xl2 object-cover" />
                          ) : (
                            <div className="h-11 w-11 rounded-xl2 bg-gradient-to-br from-espresso via-caramel to-cream" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-espresso">{product.name}</p>
                            <p className="mt-1 text-[11px] text-cocoa/60">
                              {categoryMap.get(product.categoryId) || "Category"}
                            </p>
                            <p className="mt-1 text-[11px] text-cocoa/60">{formatAdminProductPrice(product)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-[1.15rem] border border-dashed px-4 py-5 text-xs text-cocoa/60",
                        isDayTheme ? "border-[#3f7674]/18 bg-[#f7fbfb]" : "border-gold/18 bg-obsidian/35",
                      )}
                    >
                      No popular picks selected yet. Choose up to 6 menu items from the picker.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {brandError && <p className="form-error">{brandError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1 justify-center" disabled={brandSaving}>
              {brandSaving ? "Saving..." : "Save Brand"}
            </Button>
            <Button type="button" variant="secondary" onClick={resetBrand}>
              Reset
            </Button>
          </div>
        </div>
      </form>

      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Live Preview"
          title="Preview Panel"
          description="These assets will appear on the Home page and in the navigation."
        />
        <div className="mt-4 space-y-4">
          <div className={dashboardItemClass}>
            <p className="text-xs uppercase text-cocoa/60">Logo</p>
            <div className="mt-3 flex items-center gap-3">
              {logoDisplay ? (
                <img src={resolveImageUrl(logoDisplay)} alt="Logo" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-obsidian/80" />
              )}
              <span className="text-sm text-cocoa/70">Navbar brand</span>
            </div>
          </div>
          <div className={dashboardItemClass}>
            <p className="text-xs uppercase text-cocoa/60">Hero Background</p>
            {heroDisplay ? (
              <img src={heroDisplay} alt="Hero" className="mt-3 h-28 w-full rounded-xl2 object-cover" />
            ) : (
              <div className="mt-3 h-28 w-full rounded-xl2 bg-obsidian/80" />
            )}
          </div>
          <div className={dashboardItemClass}>
            <p className="text-xs uppercase text-cocoa/60">Homepage Showcase Images</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(homeDisplayGallery.length ? homeDisplayGallery : Array.from({ length: 3 })).map((image, index) => (
                <div
                  key={image || index}
                  className="h-16 overflow-hidden rounded-lg border border-gold/10 bg-obsidian/70"
                >
                  {image ? <img src={image} alt="Home display" className="h-full w-full object-cover" /> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
