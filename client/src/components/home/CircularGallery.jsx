import { CameraIcon } from "../common/Icons";
import { resolveImageUrl } from "../../services/api";

function GalleryTile({ image, alt, className = "", priority = false }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[1.5rem] border border-gold/15 bg-obsidian/65 shadow-card ${className}`}
    >
      <img
        src={resolveImageUrl(image)}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian/45 via-transparent to-transparent opacity-90" />
    </div>
  );
}

export default function CircularGallery({ images = [] }) {
  const gallery = images.filter(Boolean).slice(0, 8);

  if (!gallery.length) return null;

  const [leadImage, secondaryImage, ...restImages] = gallery;
  const secondaryTileClass =
    restImages.length === 0
      ? "aspect-[4/3] sm:aspect-auto sm:min-h-[220px] lg:col-span-2 lg:row-span-3 lg:min-h-0"
      : "aspect-[4/3] sm:aspect-auto sm:min-h-[220px] lg:col-span-2 lg:row-span-2 lg:min-h-0";

  return (
    <div className="card overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-cocoa/60">
            <CameraIcon className="h-4 w-4 text-gold" />
            Home Showcase
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-espresso">
            A Look Inside Cortina.D
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-cocoa/70">
            Atmosphere, seating, and signature corners
          </p>
        </div>
        <div className="rounded-full border border-gold/20 bg-obsidian/50 px-4 py-2 text-xs text-cocoa/70">
          {gallery.length} image{gallery.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[128px]">
        <GalleryTile
          image={leadImage}
          alt="Cortina.D atmosphere highlight"
          priority
          className="aspect-[4/3] sm:col-span-2 sm:aspect-auto sm:min-h-[320px] lg:row-span-3 lg:min-h-0"
        />

        {secondaryImage ? (
          <GalleryTile
            image={secondaryImage}
            alt="Cortina.D home showcase"
            className={secondaryTileClass}
          />
        ) : null}

        {restImages.map((image, index) => (
          <GalleryTile
            key={`${image}-${index}`}
            image={image}
            alt={`Cortina.D gallery ${index + 3}`}
            priority={index < 2}
            className="aspect-[4/3] sm:aspect-auto sm:min-h-[150px] lg:min-h-0"
          />
        ))}

        {!secondaryImage && restImages.length === 0 && (
          <div className="flex aspect-[4/3] items-center justify-center rounded-[1.35rem] border border-dashed border-gold/20 bg-obsidian/45 text-center text-xs text-cocoa/60 sm:aspect-auto sm:min-h-[150px] lg:col-span-2 lg:min-h-0">
            Add more images from the admin dashboard.
          </div>
        )}
      </div>
    </div>
  );
}
