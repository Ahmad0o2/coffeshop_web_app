import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { DashboardSectionHeading } from "./components.jsx";

const createEmptyEventForm = () => ({
  id: "",
  title: "",
  description: "",
  startDateTime: "",
  endDateTime: "",
  capacity: "",
  isActive: true,
});

const formatAdminEventDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatAdminEventRange = (event) => ({
  startsAt: formatAdminEventDate(event.startDateTime),
  endsAt: formatAdminEventDate(event.endDateTime),
});

export default function EventsTab({
  adminEvents,
  settings,
  refetchEvents,
  refetchSettings,
  dashboardItemClass,
  dashboardPanelClass,
}) {
  const queryClient = useQueryClient();
  const [eventForm, setEventForm] = useState(createEmptyEventForm);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState("");
  const [featuredSelection, setFeaturedSelection] = useState([]);
  const [featuredSaving, setFeaturedSaving] = useState(false);
  const [featuredError, setFeaturedError] = useState("");

  useEffect(() => {
    if (!settings?.featuredEventIds) return;

    const validEventIds = new Set(adminEvents.map((event) => event._id));
    const normalizedFeaturedIds = Array.from(
      new Set(
        settings.featuredEventIds.filter(
          (id) => !adminEvents.length || validEventIds.has(id),
        ),
      ),
    ).slice(0, 2);

    setFeaturedSelection(normalizedFeaturedIds);
  }, [adminEvents, settings?.featuredEventIds]);

  const resetEventForm = () => {
    setEventForm(createEmptyEventForm());
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    setEventSaving(true);
    setEventError("");

    try {
      if (!eventForm.title.trim()) {
        setEventError("Event title is required.");
        return;
      }
      if (!eventForm.startDateTime || !eventForm.endDateTime) {
        setEventError("Start and end date/time are required.");
        return;
      }

      const capacityValue =
        eventForm.capacity === "" ? undefined : Number(eventForm.capacity);
      const payload = {
        title: eventForm.title,
        description: eventForm.description || "",
        startDateTime: eventForm.startDateTime,
        endDateTime: eventForm.endDateTime,
        capacity: Number.isFinite(capacityValue) ? capacityValue : 0,
        isActive: eventForm.isActive,
      };

      if (eventForm.id) {
        await api.put(`/admin/events/${eventForm.id}`, payload);
      } else {
        await api.post("/admin/events", payload);
      }

      resetEventForm();
      await refetchEvents();
    } catch (err) {
      setEventError(err.response?.data?.message || "Failed to save event.");
    } finally {
      setEventSaving(false);
    }
  };

  const handleEventEdit = (event) => {
    setEventForm({
      id: event._id,
      title: event.title || "",
      description: event.description || "",
      startDateTime: event.startDateTime
        ? new Date(event.startDateTime).toISOString().slice(0, 16)
        : "",
      endDateTime: event.endDateTime
        ? new Date(event.endDateTime).toISOString().slice(0, 16)
        : "",
      capacity: event.capacity ?? "",
      isActive: event.isActive ?? true,
    });
  };

  const handleEventDelete = async (eventId) => {
    await api.delete(`/admin/events/${eventId}`);
    await refetchEvents();
    if (featuredSelection.includes(eventId)) {
      const next = featuredSelection.filter((id) => id !== eventId);
      setFeaturedSelection(next);
      const formData = new FormData();
      formData.append("featuredEventIds", JSON.stringify(next));
      const { data } = await api.put("/admin/settings", formData);
      if (data?.settings) {
        queryClient.setQueryData(["settings"], data.settings);
      }
      await refetchSettings();
    }
  };

  const toggleFeatured = (eventId) => {
    setFeaturedError("");
    setFeaturedSelection((prev) => {
      const normalizedPrev = Array.from(new Set(prev));

      if (normalizedPrev.includes(eventId)) {
        return normalizedPrev.filter((id) => id !== eventId);
      }
      if (normalizedPrev.length >= 2) {
        setFeaturedError("Select up to 2 events for the Home page.");
        return normalizedPrev;
      }
      return [...normalizedPrev, eventId];
    });
  };

  const saveFeatured = async () => {
    setFeaturedSaving(true);
    setFeaturedError("");
    try {
      const validEventIds = new Set(adminEvents.map((event) => event._id));
      const normalizedFeaturedIds = Array.from(
        new Set(featuredSelection.filter((id) => validEventIds.has(id))),
      ).slice(0, 2);

      const formData = new FormData();
      formData.append("featuredEventIds", JSON.stringify(normalizedFeaturedIds));
      const { data } = await api.put("/admin/settings", formData);
      if (data?.settings) {
        queryClient.setQueryData(["settings"], data.settings);
      }
      setFeaturedSelection(normalizedFeaturedIds);
      await refetchSettings();
    } catch (err) {
      setFeaturedError(
        err.response?.data?.message || "Failed to save featured events.",
      );
    } finally {
      setFeaturedSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form noValidate onSubmit={handleEventSubmit} className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Event Editor"
          title={eventForm.id ? "Edit Event" : "Add Event"}
          description="Plan event details, timing, capacity, and activation status from one panel."
        />
        <div className="mt-5 space-y-4 text-sm">
          <Input
            type="text"
            placeholder="Event title"
            value={eventForm.title}
            onChange={(e) =>
              setEventForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                Start Date & Time
              </p>
              <Input
                type="datetime-local"
                value={eventForm.startDateTime}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, startDateTime: e.target.value }))
                }
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/60">
                End Date & Time
              </p>
              <Input
                type="datetime-local"
                value={eventForm.endDateTime}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, endDateTime: e.target.value }))
                }
              />
            </div>
          </div>
          <Textarea
            placeholder="Description"
            value={eventForm.description}
            onChange={(e) =>
              setEventForm((prev) => ({ ...prev, description: e.target.value }))
            }
            rows="3"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              placeholder="Capacity (0 = unlimited)"
              value={eventForm.capacity}
              onChange={(e) =>
                setEventForm((prev) => ({ ...prev, capacity: e.target.value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-cocoa/70">
            <input
              type="checkbox"
              checked={eventForm.isActive}
              onChange={(e) =>
                setEventForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              className="accent-gold"
            />
            Active
          </label>
          {eventError && <p className="form-error">{eventError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1 justify-center" disabled={eventSaving}>
              {eventSaving
                ? "Saving..."
                : eventForm.id
                  ? "Update Event"
                  : "Create Event"}
            </Button>
            {eventForm.id && (
              <Button type="button" variant="secondary" onClick={resetEventForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Calendar Overview"
          title="Events"
          description={`${adminEvents.length} events available, including featured selections for the Home page.`}
          action={
            <Button variant="secondary" onClick={saveFeatured} disabled={featuredSaving}>
              {featuredSaving ? "Saving..." : "Save Featured"}
            </Button>
          }
        />
        {featuredError && <p className="form-error mt-3">{featuredError}</p>}
        <div className="mt-4 space-y-3 text-sm">
          {adminEvents.map((event) => {
            const eventRange = formatAdminEventRange(event);
            return (
              <div
                key={event._id}
                className={cn(
                  dashboardItemClass,
                  "flex flex-wrap items-start justify-between gap-4",
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-espresso">{event.title}</p>
                  <div className="mt-2 space-y-1 text-xs text-cocoa/65">
                    <p>
                      <span className="font-semibold text-cocoa/80">Starts:</span>{" "}
                      {eventRange.startsAt}
                    </p>
                    <p>
                      <span className="font-semibold text-cocoa/80">Ends:</span>{" "}
                      {eventRange.endsAt}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge>{event.isActive ? "Active" : "Inactive"}</Badge>
                    <span className="pill">
                      {event.registrationsCount || 0}
                      {event.capacity > 0 ? ` / ${event.capacity}` : ""} registered
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={featuredSelection.includes(event._id) ? "default" : "secondary"}
                    onClick={() => toggleFeatured(event._id)}
                  >
                    Home
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleEventEdit(event)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEventDelete(event._id)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {adminEvents.length === 0 && (
            <p className="text-sm text-cocoa/60">No events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
