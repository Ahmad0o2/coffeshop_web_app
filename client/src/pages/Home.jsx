import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import useAuth from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import useRealtimeInvalidation from "../hooks/useRealtimeInvalidation";
import useTheme from "../hooks/useTheme";
import CircularGallery from "../components/home/CircularGallery";
import { MapPinIcon, SparkIcon } from "../components/common/Icons";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  PageHeroSkeleton,
  PulseLogoLoader,
} from "../components/common/PageSkeleton";
import api, { resolveImageUrl } from "../services/api";
import { getDisplayPrice } from "../utils/pricing";

const fetchEvents = async () => {
  const { data } = await api.get("/events");
  return data.events || [];
};

const fetchProducts = async () => {
  const { data } = await api.get("/products?page=1&limit=100");
  return data.data || data.products || [];
};

const formatEventDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-GB", { weekday: "short" });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} - ${time}`;
};

const getGreeting = (fullName) => {
  if (!fullName) return "";
  const firstName = fullName.split(" ")[0];
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
};

function HomeLoading() {
  return (
    <>
      <PulseLogoLoader />
      <PageHeroSkeleton cards={6} />
    </>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const realtimeBindings = useMemo(
    () => [
      { event: "catalog:changed", queryKeys: [["products"]] },
      { event: "order:new", queryKeys: [["products"]] },
      { event: "order:status", queryKeys: [["products"]] },
      { event: "events:changed", queryKeys: [["events"]] },
    ],
    [],
  );

  useRealtimeInvalidation(realtimeBindings);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    enabled: isAuthenticated,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const productMap = useMemo(
    () => new Map(products.map((product) => [product._id, product])),
    [products],
  );

  const heroImage = settings?.heroImageUrl;
  const homeDisplayImages = settings?.homeDisplayUrls?.filter(Boolean) || [];
  const featuredEventIds = settings?.featuredEventIds || [];
  const featuredEvents = isAuthenticated
    ? events.filter((event) => featuredEventIds.includes(event._id)).slice(0, 2)
    : [];

  const todaysSpecial = settings?.todaysSpecialProductId
    ? productMap.get(settings.todaysSpecialProductId) || null
    : products[0] || null;

  const featuredProducts = useMemo(() => {
    const selected = (settings?.featuredProductIds || [])
      .map((id) => productMap.get(id))
      .filter(Boolean);

    if (selected.length) return selected.slice(0, 6);
    return products.slice(0, 6);
  }, [settings?.featuredProductIds, productMap, products]);

  const rewardCardPreview = useMemo(
    () => ({
      lastFour: "4827",
      cvv: "314",
    }),
    [],
  );

  if (
    settingsLoading ||
    productsLoading ||
    (isAuthenticated && eventsLoading)
  ) {
    return <HomeLoading />;
  }

  const specialDisplayPrice = todaysSpecial
    ? getDisplayPrice(todaysSpecial)
    : { price: 0, isFrom: false };
  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Cortina.D Coffee House",
    url: siteOrigin ? `${siteOrigin}/` : "/",
    image:
      heroImage || (siteOrigin ? `${siteOrigin}/brand_logo.webp` : "/brand_logo.webp"),
    servesCuisine: ["Coffee", "Cafe", "Desserts"],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Uni Street",
      addressLocality: "Irbid",
      addressCountry: "JO",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "09:00",
        closes: "00:00",
      },
    ],
  };

  const greeting = isAuthenticated ? getGreeting(user?.fullName) : "";
  const isDayTheme = theme === "day";
  const heroCardStyle = {
    opacity: 1,
  };
  const infoBoxStyle = {
    transform: "none",
    opacity: 1,
  };
  const heroOverlayStyle = isDayTheme
    ? {
        background:
          "radial-gradient(circle_at_18%_24%,rgba(82,148,146,0.18),transparent 34%),linear-gradient(180deg,rgba(243,248,248,0.48),rgba(214,229,228,0.7))",
      }
    : {
        background:
          "radial-gradient(circle_at_18%_24%,rgba(234,181,99,0.18),transparent 24%),linear-gradient(180deg,rgba(13,10,9,0.72),rgba(13,10,9,0.92))",
      };
  const specialCardClass = isDayTheme
    ? "relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#3f7674]/18 bg-[linear-gradient(135deg,rgba(250,253,253,0.99),rgba(226,240,239,0.98),rgba(112,176,173,0.92))] shadow-[0_20px_45px_rgba(34,71,70,0.14)]"
    : "relative min-h-[320px] overflow-hidden rounded-[2rem] border border-gold/25 bg-[linear-gradient(135deg,rgba(13,10,9,0.96),rgba(91,59,38,0.92),rgba(234,181,99,0.24))] shadow-card";
  const infoCardClass = isDayTheme
    ? "rounded-[1.6rem] border border-[#3f7674]/14 bg-[rgba(250,253,253,0.96)] p-6 shadow-[0_16px_32px_rgba(34,71,70,0.1)] backdrop-blur-md"
    : "rounded-[1.6rem] border border-gold/20 bg-obsidian/88 p-6 shadow-card backdrop-blur";
  const greetingClass = isDayTheme
    ? "greeting-glow inline-flex rounded-full border border-[#3f7674]/18 bg-[rgba(248,253,253,0.96)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#315f5e]"
    : "greeting-glow inline-flex rounded-full border border-gold/25 bg-obsidian/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold";
  const orderNowClass = isDayTheme
    ? "border border-[#315f5e]/28 bg-gradient-to-r from-[#284d4c] via-[#3f7674] to-[#529492] text-cream shadow-[0_14px_28px_rgba(40,77,76,0.26)] hover:brightness-105"
    : "";
  const secondaryButtonClass = isDayTheme
    ? "border border-[#3f7674]/16 bg-[rgba(249,253,253,0.94)] text-espresso hover:bg-[#deeeee]"
    : "";
  const outlineButtonClass = isDayTheme
    ? "border border-[#3f7674]/16 bg-[rgba(248,252,252,0.8)] text-espresso hover:bg-[rgba(224,239,238,0.96)]"
    : "";
  const viewItemClass = isDayTheme
    ? "border-[#3f7674]/16 bg-[rgba(226,240,239,0.96)] text-espresso hover:bg-[#d0e8e7]"
    : "border-gold/25 bg-obsidian/70 text-cream hover:bg-obsidian/85";
  const specialPriceClass = isDayTheme
    ? "rounded-full border border-[#3f7674]/14 bg-[rgba(232,244,243,0.98)] px-4 py-2 text-base font-semibold text-espresso"
    : "rounded-full bg-obsidian/70 px-4 py-2 text-base font-semibold text-cream";
  const specialCaptionClass = isDayTheme
    ? "text-xs uppercase tracking-[0.34em] text-[#315f5e]"
    : "text-xs uppercase tracking-[0.34em] text-cream/90";
  const specialTitleClass = isDayTheme
    ? "truncate text-3xl font-semibold text-espresso sm:text-[2rem]"
    : "truncate text-3xl font-semibold text-cream sm:text-[2rem]";
  const specialDescriptionClass = isDayTheme
    ? "line-clamp-2 text-base leading-7 text-cocoa/92"
    : "line-clamp-2 text-base leading-7 text-cream/90";
  const infoLabelClass = isDayTheme
    ? "text-xs uppercase tracking-[0.24em] text-[#315f5e]"
    : "text-xs uppercase tracking-[0.24em] text-cocoa/85";
  const badgeClass = isDayTheme
    ? "border-[#3f7674]/18 bg-[#dcefee] text-[#315f5e]"
    : "";
  const specialAccentClass = isDayTheme ? "text-[#315f5e]" : "text-gold";
  const caramelDotClass = isDayTheme ? "bg-[#529492]" : "bg-caramel";
  const locationIconClass = isDayTheme
    ? "flex h-11 w-11 items-center justify-center rounded-full bg-[#d8eceb] text-[#315f5e]"
    : "flex h-11 w-11 items-center justify-center rounded-full bg-gold/20 text-gold";
  const infoValueClass = isDayTheme
    ? "mt-3 text-2xl font-semibold text-espresso"
    : "mt-3 text-2xl font-semibold text-cream";
  const heroTitleClass = isDayTheme
    ? "max-w-3xl text-4xl font-semibold leading-[1.02] text-espresso sm:text-5xl lg:text-6xl"
    : "max-w-3xl text-4xl font-semibold leading-[1.02] text-cream sm:text-5xl lg:text-6xl";
  const heroTextClass = isDayTheme
    ? "max-w-xl text-base text-cocoa/96 sm:text-lg"
    : "max-w-xl text-base text-cocoa/90 sm:text-lg";
  const heroMetaClass = isDayTheme
    ? "flex flex-wrap gap-4 text-sm text-cocoa/92"
    : "flex flex-wrap gap-4 text-sm text-cocoa/90";
  const rewardsCardClass = isDayTheme
    ? "card overflow-hidden border border-[#3f7674]/16 bg-[linear-gradient(180deg,rgba(249,253,253,0.99),rgba(230,242,241,0.98))] px-5 py-7 text-espresso shadow-[0_18px_38px_rgba(34,71,70,0.12)] sm:px-8 sm:py-9"
    : "card overflow-hidden bg-gradient-to-br from-obsidian via-caramel/20 to-caramel/55 px-5 py-7 text-cream sm:px-8 sm:py-9";
  const rewardsTitleClass = isDayTheme
    ? "text-2xl font-semibold leading-tight text-espresso"
    : "text-2xl font-semibold leading-tight text-cream";
  const rewardsTextClass = isDayTheme
    ? "max-w-[40rem] text-sm leading-7 text-cocoa/94 sm:text-[0.98rem]"
    : "max-w-[40rem] text-sm leading-7 text-cream/90 sm:text-[0.98rem]";
  const rewardsCardInnerClass =
    featuredEvents.length > 0
      ? "max-w-[38rem] space-y-4 lg:pr-4"
      : "max-w-[40rem] space-y-4";
  const rewardsSectionLayoutClass =
    featuredEvents.length > 0
      ? "space-y-5"
      : "space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(23rem,26rem)] lg:items-center lg:gap-8 lg:space-y-0";
  const rewardsPreviewWrapClass =
    featuredEvents.length > 0
      ? isDayTheme
        ? "relative left-1/2 mt-4 flex w-[104%] max-w-none -translate-x-1/2 origin-top justify-center rounded-[1.3rem] border border-[#3f7674]/18 bg-[linear-gradient(135deg,rgba(222,240,239,0.96),rgba(188,221,219,0.94))] px-2 py-2 shadow-[0_14px_32px_rgba(34,71,70,0.16)] scale-[0.96] sm:left-auto sm:w-full sm:max-w-[22.5rem] sm:translate-x-0 sm:scale-[0.98]"
        : "relative left-1/2 mt-4 flex w-[104%] max-w-none -translate-x-1/2 origin-top justify-center rounded-[1.3rem] border border-gold/15 bg-[rgba(255,252,247,0.65)] px-2 py-2 shadow-[0_14px_32px_rgba(78,52,33,0.08)] scale-[0.96] sm:left-auto sm:w-full sm:max-w-[22.5rem] sm:translate-x-0 sm:scale-[0.98]"
      : isDayTheme
        ? "relative left-1/2 mt-4 flex w-[104%] max-w-none -translate-x-1/2 origin-top justify-center rounded-[1.3rem] border border-[#3f7674]/16 bg-[linear-gradient(135deg,rgba(223,240,239,0.94),rgba(191,223,221,0.92))] px-1.5 py-1.5 shadow-[0_10px_22px_rgba(34,71,70,0.14)] scale-[0.95] sm:left-auto sm:w-full sm:max-w-[22rem] sm:translate-x-0 sm:scale-[0.97] lg:mt-0 lg:mx-0 lg:w-full lg:max-w-[26rem] lg:justify-self-end lg:justify-center lg:scale-100"
        : "relative left-1/2 mt-4 flex w-[104%] max-w-none -translate-x-1/2 origin-top justify-center rounded-[1.3rem] border border-gold/12 bg-[rgba(255,252,247,0.52)] px-1.5 py-1.5 shadow-[0_10px_22px_rgba(78,52,33,0.06)] scale-[0.95] sm:left-auto sm:w-full sm:max-w-[22rem] sm:translate-x-0 sm:scale-[0.97] lg:mt-0 lg:mx-0 lg:w-full lg:max-w-[26rem] lg:justify-self-end lg:justify-center lg:scale-100";
  const rewardsPreviewCardClass = isDayTheme
    ? featuredEvents.length > 0
      ? "relative w-full min-h-[10.5rem] overflow-hidden rounded-[1.15rem] border border-[#315f5e]/20 bg-[linear-gradient(135deg,rgba(145,200,198,0.98),rgba(63,118,116,0.99),rgba(40,77,76,0.97))] p-3 text-cream shadow-card"
      : "relative w-full min-h-[10.25rem] overflow-hidden rounded-[1rem] border border-[#315f5e]/20 bg-[linear-gradient(135deg,rgba(145,200,198,0.98),rgba(63,118,116,0.99),rgba(40,77,76,0.97))] p-3 text-cream shadow-card"
    : featuredEvents.length > 0
      ? "relative w-full min-h-[10.5rem] overflow-hidden rounded-[1.15rem] border border-gold/18 bg-gradient-to-br from-[#6f3d1b] via-[#935224] to-[#c37a39] p-3 text-cream shadow-card"
      : "relative w-full min-h-[10.25rem] overflow-hidden rounded-[1rem] border border-gold/16 bg-gradient-to-br from-[#6f3d1b] via-[#935224] to-[#c37a39] p-3 text-cream shadow-card";
  const rewardsPreviewGlowClass = isDayTheme
    ? "absolute inset-0 bg-[linear-gradient(120deg,transparent_12%,rgba(228,247,246,0.12)_34%,rgba(255,255,255,0.28)_50%,rgba(205,236,235,0.18)_62%,transparent_82%),radial-gradient(circle_at_top_right,rgba(224,246,245,0.24),transparent_38%)]"
    : "absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%)]";
  const rewardsPreviewTitleClass = isDayTheme
    ? "text-base font-semibold text-[#f8fcfc] sm:text-2xl"
    : "text-base font-semibold text-cream sm:text-2xl";
  const rewardsPreviewBadgeClass = isDayTheme
    ? "rounded-full border border-white/20 bg-[rgba(248,252,252,0.14)] px-2 py-1 text-[0.52rem] font-semibold uppercase tracking-[0.18em] text-[#f8fcfc] sm:px-3 sm:text-[0.65rem] sm:tracking-[0.24em]"
    : "rounded-full border border-cream/20 bg-cream/10 px-2 py-1 text-[0.52rem] font-semibold uppercase tracking-[0.18em] text-cream/85 sm:px-3 sm:text-[0.65rem] sm:tracking-[0.24em]";
  const rewardsPreviewInnerClass = isDayTheme
    ? "relative flex flex-1 flex-col justify-between overflow-hidden rounded-[1.1rem] border border-white/14 bg-[rgba(10,23,23,0.18)] px-3.5 py-2.5 sm:px-4 sm:py-3"
    : "relative flex flex-1 flex-col justify-between overflow-hidden rounded-[1.1rem] border border-cream/20 bg-obsidian/20 px-3.5 py-2.5 sm:px-4 sm:py-3";
  const rewardsPreviewLabelClass = isDayTheme
    ? "text-[0.58rem] uppercase tracking-[0.24em] text-cream/72 sm:text-[0.62rem] sm:tracking-[0.28em]"
    : "text-[0.58rem] uppercase tracking-[0.24em] text-cream/78 sm:text-[0.62rem] sm:tracking-[0.28em]";
  const rewardsPreviewNumberClass = isDayTheme
    ? "mt-1.5 whitespace-nowrap font-mono text-[0.82rem] tracking-[0.06em] text-cream sm:text-[1.1rem] sm:tracking-[0.16em]"
    : "mt-1.5 whitespace-nowrap font-mono text-[0.82rem] tracking-[0.06em] text-cream sm:text-[1.1rem] sm:tracking-[0.16em]";
  const rewardsPreviewValueClass = isDayTheme
    ? "mt-1.5 text-[0.65rem] font-semibold tracking-[0.03em] text-cream sm:text-sm sm:tracking-[0.08em]"
    : "mt-1.5 text-[0.65rem] font-semibold tracking-[0.03em] text-cream sm:text-sm sm:tracking-[0.08em]";
  const rewardsPreviewMetaClass = isDayTheme
    ? "text-[0.6rem] uppercase tracking-[0.22em] text-cream/70 sm:text-[0.65rem] sm:tracking-[0.28em]"
    : "text-[0.6rem] uppercase tracking-[0.22em] text-cream/60 sm:text-[0.65rem] sm:tracking-[0.28em]";
  const rewardsPreviewMetaValueClass = isDayTheme
    ? "mt-1 text-[0.65rem] font-medium text-cream/95 sm:text-sm"
    : "mt-1 text-[0.65rem] font-medium text-cream/92 sm:text-sm";
  const eventsPanelClass = isDayTheme
    ? "card border border-[#3f7674]/14 bg-[rgba(249,253,253,0.98)] p-6 shadow-[0_14px_30px_rgba(34,71,70,0.1)]"
    : "card p-6";
  const eventItemClass = isDayTheme
    ? "rounded-xl2 border border-[#3f7674]/12 bg-[#eaf5f4] p-4"
    : "rounded-xl2 border border-gold/15 bg-obsidian/55 p-4";
  const eventTitleClass = isDayTheme
    ? "text-sm font-semibold text-espresso"
    : "text-sm font-semibold text-espresso";
  const eventMetaClass = isDayTheme
    ? "mt-1 text-xs text-cocoa/82"
    : "mt-1 text-xs text-cocoa/75";
  const eventDescriptionClass = isDayTheme
    ? "mt-3 text-sm text-cocoa/94"
    : "mt-3 text-sm text-cocoa/85";
  const specialImageFallbackClass = isDayTheme
    ? "flex h-full w-full items-center justify-center bg-gradient-to-br from-[#315f5e] via-[#529492] to-[#74b4b2]"
    : "flex h-full w-full items-center justify-center bg-gradient-to-br from-obsidian/35 via-caramel/45 to-gold/75";
  const productImageFallbackClass = isDayTheme
    ? "h-full w-full bg-gradient-to-br from-[#315f5e] via-[#529492] to-[#74b4b2]"
    : "h-full w-full bg-gradient-to-br from-obsidian via-caramel/75 to-gold";
  const heroImageClass =
    "pointer-events-none absolute inset-0 bg-cover bg-center";
  const heroImageStyle = {
    backgroundImage: `url(${heroImage})`,
    opacity: isDayTheme ? 0.52 : 0.4,
    filter: isDayTheme ? "blur(2px)" : "blur(4px)",
    transform: isDayTheme ? "scale(1.02)" : "scale(1.03)",
  };
  const heroOverlayLayerStyle = {
    ...heroOverlayStyle,
    opacity: isDayTheme ? 0.68 : 0.99,
  };

  return (
    <>
      <Helmet>
        <title>Cortina.D Coffee House</title>
        <meta
          name="description"
          content="Discover Cortina.D Coffee House in Irbid: signature drinks, featured menu picks, rewards, events, and a refined coffee house experience."
        />
        <meta property="og:title" content="Cortina.D Coffee House" />
        <meta
          property="og:description"
          content="Signature coffee, featured specials, rewards, and events from Cortina.D Coffee House."
        />
        <meta property="og:type" content="website" />
        {heroImage ? <meta property="og:image" content={heroImage} /> : null}
        <script type="application/ld+json">
          {JSON.stringify(restaurantSchema)}
        </script>
      </Helmet>

      <section className="relative overflow-hidden">
        {heroImage && <div className={heroImageClass} style={heroImageStyle} />}
        <div
          className="pointer-events-none absolute inset-0"
          style={heroOverlayLayerStyle}
        />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_0.95fr] lg:py-20">
          <div className="space-y-6">
            <div className="flex flex-col items-start gap-3">
              {greeting && <div className={greetingClass}>{greeting}</div>}
              <Badge variant="highlight" className={badgeClass}>
                Uni Street - Irbid
              </Badge>
            </div>
            <h1 className={heroTitleClass}>
              Warm coffee,
              <br />
              modern moments.
            </h1>
            <p className={heroTextClass}>
              Order in a few taps, settle into the space, and move between calm
              study hours and late-night energy without losing the luxury feel.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant={isDayTheme ? "default" : "special"}
                size="lg"
                className={orderNowClass}
              >
                <Link to="/menu">Order Now</Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className={secondaryButtonClass}
              >
                <Link to="/menu">View Menu</Link>
              </Button>
              <Button asChild variant="outline" className={outlineButtonClass}>
                <Link to="/location">Open Location</Link>
              </Button>
            </div>
            <div className={heroMetaClass}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-mint" />
                Live order updates
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${caramelDotClass}`} />
                Study-friendly zones
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 py-2.5">
            <div className={specialCardClass} style={heroCardStyle}>
              <div className="relative h-full p-6 sm:p-8">
                <div className="flex h-full max-w-lg flex-col justify-between gap-6">
                  <div
                    className={`flex items-center gap-2.5 ${specialAccentClass}`}
                  >
                    <SparkIcon className="h-4 w-4" />
                    <p className={specialCaptionClass}>Today's Special</p>
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-4 sm:flex-row sm:items-center sm:gap-5">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.4rem] border border-gold/20 bg-obsidian/25 shadow-card">
                      {todaysSpecial?.imageUrl ? (
                        <img
                          src={resolveImageUrl(todaysSpecial.imageUrl)}
                          alt={todaysSpecial.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className={specialImageFallbackClass}>
                          <SparkIcon className="h-9 w-9 text-cream" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className={specialTitleClass}>
                        {todaysSpecial?.name || "Cortina Selection"}
                      </h2>
                      <p className={specialDescriptionClass}>
                        {todaysSpecial?.description ||
                          "Picked from the menu for today."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3.5 sm:gap-4">
                    <span className={specialPriceClass}>
                      {specialDisplayPrice.isFrom ? "From " : ""}
                      {specialDisplayPrice.price.toFixed(2)} JD
                    </span>
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className={viewItemClass}
                    >
                      <Link
                        to={
                          todaysSpecial ? `/menu/${todaysSpecial._id}` : "/menu"
                        }
                      >
                        View Item
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2" style={infoBoxStyle}>
              <div className={infoCardClass}>
                <p className={infoLabelClass}>Pickup</p>
                <p className={infoValueClass}>12 minutes</p>
              </div>
              <div className={infoCardClass}>
                <p className={infoLabelClass}>Seats</p>
                <p className={infoValueClass}>Plenty open</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-10 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Popular Picks</h2>
            <p className="section-subtitle text-cocoa/85">
              Selected from our best and popular menu items.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              variant="secondary"
              className={secondaryButtonClass}
            >
              <Link to="/menu">Browse Menu</Link>
            </Button>
            <Button asChild variant="outline" className={outlineButtonClass}>
              <Link to="/gallery">Full Gallery</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((item) => {
            const { price, isFrom } = getDisplayPrice(item);
            const productPath = `/menu/${item._id}`;
            const navigationState = { from: location.pathname };
            return (
              <div
                key={item._id}
                className="card overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-cardHover cursor-pointer"
                role="link"
                tabIndex={0}
                aria-label={`Open ${item.name}`}
                onClick={() =>
                  navigate(productPath, { state: navigationState })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(productPath, { state: navigationState });
                  }
                }}
              >
                <div className="relative h-52 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={resolveImageUrl(item.imageUrl)}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className={productImageFallbackClass} />
                  )}
                  <div className="absolute bg-gradient-to-t from-obsidian via-obsidian/15 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <Badge>
                      {item.isAvailable === false ? "Paused" : "Popular"}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4 rounded-full bg-obsidian/80 px-4 py-2 text-sm font-semibold text-cream">
                    {isFrom ? "From " : ""}
                    {price.toFixed(2)} JD
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-espresso">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-sm text-cocoa/85">
                    {item.description || "Built for Cortina regulars."}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className={`mt-5 w-full justify-center ${secondaryButtonClass}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(productPath, { state: navigationState });
                    }}
                  >
                    View Product
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className={`mx-auto grid w-full max-w-6xl gap-6 px-6 pb-12 ${
          featuredEvents.length > 0
            ? "lg:grid-cols-[1.05fr_0.95fr]"
            : "lg:grid-cols-1"
        }`}
      >
        <div className={rewardsCardClass}>
          <div className={rewardsSectionLayoutClass}>
            <div className={rewardsCardInnerClass}>
              <h2 className={rewardsTitleClass}>
                Rewards that actually feel good.
              </h2>
              <p className={rewardsTextClass}>
                Collect points on every completed order, unlock better
                redemptions, and keep the experience tied to your regular
                visits.
              </p>
              <Button
                asChild
                variant="secondary"
                className={secondaryButtonClass}
              >
                <Link to={isAuthenticated ? "/rewards" : "/sign-in"}>
                  {isAuthenticated ? "View Rewards" : "Sign in"}
                </Link>
              </Button>
            </div>

            <div className={rewardsPreviewWrapClass}>
              <div className={rewardsPreviewCardClass}>
                <div className={rewardsPreviewGlowClass} />
                <div className="relative flex h-full flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={rewardsPreviewTitleClass}>
                        Cortina.D Member
                      </p>
                    </div>
                    <span className={rewardsPreviewBadgeClass}>Loyalty</span>
                  </div>

                  <div className={rewardsPreviewInnerClass}>
                    <div>
                      <p className={rewardsPreviewLabelClass}>Card Number</p>
                      <p className={rewardsPreviewNumberClass}>
                        **** **** **** {rewardCardPreview.lastFour}
                      </p>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className={rewardsPreviewLabelClass}>Member</p>
                        <p className={rewardsPreviewValueClass}>Coffe Master</p>
                      </div>
                      <div className="text-right">
                        <p className={rewardsPreviewLabelClass}>CVV</p>
                        <p className={rewardsPreviewValueClass}>
                          {rewardCardPreview.cvv}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className={rewardsPreviewMetaClass}>Home feature</p>
                    <p className={rewardsPreviewMetaValueClass}>
                      Ready for a custom card visual
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {featuredEvents.length > 0 && (
          <div className={eventsPanelClass}>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-espresso">
                Upcoming Events
              </h3>
            </div>
            <div className="mt-4 space-y-3">
              {featuredEvents.map((event) => (
                <div key={event._id} className={eventItemClass}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={eventMetaClass}>
                        {formatEventDate(event.startDateTime)}
                      </p>
                      <p className={`mt-1.5 ${eventTitleClass}`}>
                        {event.title}
                      </p>
                    </div>
                    <Badge>Featured</Badge>
                  </div>
                  <p className={eventDescriptionClass}>
                    {event.description ||
                      "More details available on the events page."}
                  </p>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className={`mt-4 ${secondaryButtonClass}`}
                  >
                    <Link to="/events">Go to Event</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {homeDisplayImages.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-12">
          <CircularGallery images={homeDisplayImages} />
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className={locationIconClass}>
              <MapPinIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-espresso">
                Visit Cortina.D
              </p>
              <p className="text-xs text-cocoa/75">Uni Street, Irbid, Jordan</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="pill inline-flex items-center justify-center text-center">
              Daily - 9:00 AM to 12:00 AM
            </span>
            <Button
              asChild
              variant="secondary"
              className={secondaryButtonClass}
            >
              <Link to="/location">Location</Link>
            </Button>
            <Button asChild variant="outline" className={outlineButtonClass}>
              <Link to="/gallery">Gallery</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
