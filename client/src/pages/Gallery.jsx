import { Link } from "react-router-dom";
import useSettings from "../hooks/useSettings";
import { CameraIcon } from "../components/common/Icons";
import { Button } from "../components/ui/button";

const fallbackGalleryImages = (import.meta.env.VITE_GALLERY_IMAGES || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export default function Gallery() {
  const { data: settings, isLoading } = useSettings();
  const images = settings?.galleryUrls?.filter(Boolean)?.length
    ? settings.galleryUrls.filter(Boolean)
    : fallbackGalleryImages;

  return (
    <section className="section-shell">
      <div className="card overflow-hidden p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cocoa/60">
              <CameraIcon className="h-4 w-4 text-gold" />
              Gallery
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-espresso sm:text-4xl">
              Cortina.D Space
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cocoa/70">
              Large-format photos of the cafe atmosphere, seating, and
              late-night mood.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/location">Open Location</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid auto-rows-[180px] gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`animate-pulse rounded-xl3 border border-gold/15 bg-white/5 ${
                  index % 3 === 0 ? "row-span-2" : "row-span-1"
                }`}
              />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="card p-8 text-sm text-cocoa/70">
            No gallery images yet.
          </div>
        ) : (
          <div className="grid auto-rows-[180px] gap-5 md:grid-cols-2 xl:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className={`group overflow-hidden rounded-xl3 border border-gold/20 bg-obsidian/60 shadow-card ${
                  index % 5 === 0
                    ? "row-span-2 xl:col-span-2"
                    : index % 3 === 0
                      ? "row-span-2"
                      : "row-span-1"
                }`}
              >
                <img
                  src={image}
                  alt={`Cortina gallery ${index + 1}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
