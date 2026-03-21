import useTheme from "../hooks/useTheme";
import { Helmet } from "react-helmet-async";
import { MapPinIcon, SparkIcon } from "../components/common/Icons";
import { Button } from "../components/ui/button";
import { WorldMap } from "../components/ui/map";

const locationUrl =
  "https://maps.google.com/?q=Cortina.D%20Coffee%20House%20Uni%20Street%20Irbid";

export default function Location() {
  const { theme } = useTheme();
  const isDayTheme = theme === "day";

  const openLocation = () => {
    window.open(locationUrl, "_blank", "noopener,noreferrer");
  };

  const locationMarkers = [
    {
      lat: 38.85,
      lng: 56.85,
      label: "Jordan, Irbid",
      offsetX: 14,
      onClick: openLocation,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Find Us — Cortina.D</title>
        <meta
          name="description"
          content="Find Cortina.D Coffee House on Uni Street in Irbid, Jordan, with an interactive map and opening hours."
        />
        <meta property="og:title" content="Find Us — Cortina.D" />
        <meta
          property="og:description"
          content="Locate Cortina.D Coffee House in Irbid and open directions directly in Google Maps."
        />
      </Helmet>
      <section className="section-shell">
        <div className="card p-3.5 sm:p-8">
          <div className="grid gap-3.5 sm:gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <div className="mb-3.5 space-y-1.5 sm:mb-7 sm:space-y-3">
                <div className="flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.22em] text-cocoa/60 sm:text-xs sm:tracking-[0.3em]">
                  <MapPinIcon className="h-3.5 w-3.5 text-gold sm:h-4 sm:w-4" />
                  Location
                </div>
                <h1 className="text-[1.42rem] font-semibold text-espresso sm:text-4xl">
                  Find Cortina.D quickly
                </h1>
                <p className="text-[0.76rem] leading-[1.15rem] text-cocoa/70 sm:text-sm sm:leading-6">
                  The map is interactive. Press on the pulsing dot and the cafe
                  location opens directly in Google Maps.
                </p>
              </div>

            <div className="space-y-2 text-[0.76rem] sm:space-y-3 sm:text-sm">
              <div className="rounded-xl2 border border-gold/20 bg-obsidian/40 p-2.5 sm:p-4">
                <p className="font-semibold text-espresso">Address</p>
                <p className="mt-1 text-cocoa/70">Uni Street, Irbid, Jordan</p>
              </div>
              <div className="rounded-xl2 border border-gold/20 bg-obsidian/40 p-2.5 sm:p-4">
                <p className="font-semibold text-espresso">Hours</p>
                <p className="mt-1 text-cocoa/70">Daily, 9:00 AM to 12:00 AM</p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button
                variant="luxury"
                onClick={openLocation}
                className="w-full sm:w-auto"
              >
                Open in Google Maps
              </Button>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-5">
            <div className="text-center">
              <div className="mx-auto max-w-[22rem] space-y-1 sm:max-w-2xl sm:space-y-2">
                <h2 className="text-[1rem] font-semibold text-espresso sm:text-4xl">
                  Our Location
                </h2>
                <p className="text-[0.74rem] leading-[1.1rem] text-cocoa/70 sm:text-base">
                  Follow the highlighted routes into Irbid, then tap the map to
                  jump straight to Cortina.D on Google Maps.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 px-3 pt-2.5 text-center sm:px-8 sm:pt-8">
                <div className="inline-flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.15em] text-cocoa sm:gap-2.5 sm:text-[1rem] sm:tracking-[0.28em]">
                  <SparkIcon className="h-3.5 w-3.5 text-cocoa sm:h-[1.55rem] sm:w-[1.55rem]" />
                  Live Map
                </div>
              </div>

              <WorldMap
                dots={[]}
                markers={locationMarkers}
                lineColor={isDayTheme ? "#3f7b79" : "#e0be8b"}
                labelClassName="text-[0.7rem] sm:text-xs"
                focus={{ lat: 36.5556, lng: 35.85, zoom: 0.5, offsetX: -25 }}
                className={`h-[140px] sm:h-[260px] md:h-[320px] lg:h-[460px] shadow-card ${
                  isDayTheme
                    ? "shadow-[0_24px_56px_rgba(49,95,94,0.14)]"
                    : "shadow-[0_24px_56px_rgba(0,0,0,0.38)]"
                }`}
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center px-2.5 sm:bottom-8 sm:px-6">
                <div className="rounded-full border border-gold/20 bg-obsidian/85 px-2.5 py-1 text-center text-[0.52rem] font-semibold text-cream shadow-card backdrop-blur sm:px-5 sm:py-3 sm:text-sm">
                  Cortina.D Coffee House - Uni Street, Irbid
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
