import { useMemo, useState } from "react";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import SelectMenu from "../../components/common/SelectMenu";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { staffPermissionOptions } from "./shared.js";
import { DashboardSectionHeading } from "./components.jsx";

const createEmptyStaffForm = () => ({
  id: "",
  fullName: "",
  email: "",
  phone: "",
  role: "Staff",
  password: "",
  permissions: [],
});

export default function StaffTab({
  isAdmin,
  staffList,
  refetchStaff,
  dashboardItemClass,
  dashboardPanelClass,
}) {
  const [staffForm, setStaffForm] = useState(createEmptyStaffForm);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState("");

  const permissionMap = useMemo(
    () => new Map(staffPermissionOptions.map((perm) => [perm.value, perm.label])),
    [],
  );

  if (!isAdmin) {
    return null;
  }

  const resetStaffForm = () => {
    setStaffForm(createEmptyStaffForm());
    setStaffError("");
  };

  const togglePermission = (permission) => {
    setStaffForm((prev) => {
      const has = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((item) => item !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    setStaffSaving(true);
    setStaffError("");
    try {
      if (!staffForm.email.trim()) {
        setStaffError("Email is required.");
        return;
      }
      if (staffForm.password && staffForm.password.trim().length < 6) {
        setStaffError("Password must be at least 6 characters.");
        return;
      }
      const payload = {
        email: staffForm.email.trim(),
        role: staffForm.role,
        permissions: staffForm.permissions,
      };
      if (staffForm.fullName.trim()) {
        payload.fullName = staffForm.fullName.trim();
      }
      if (staffForm.phone.trim()) {
        payload.phone = staffForm.phone.trim();
      }
      if (staffForm.password) {
        payload.password = staffForm.password;
      }
      if (staffForm.id) {
        await api.patch(`/admin/staff/${staffForm.id}`, payload);
      } else {
        await api.post("/admin/staff", payload);
      }
      resetStaffForm();
      await refetchStaff();
    } catch (err) {
      setStaffError(getApiErrorMessage(err, "Failed to save staff."));
    } finally {
      setStaffSaving(false);
    }
  };

  const handleStaffDelete = async (member) => {
    await api.delete(`/admin/staff/${member.id}`);
    await refetchStaff();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form noValidate onSubmit={handleStaffSubmit} className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Team Access"
          title={staffForm.id ? "Edit Staff" : "Add Staff"}
          description="Add staff by email, assign permissions, and manage who can access each workspace."
        />
        <div className="mt-5 space-y-4 text-sm">
          <Input
            type="text"
            placeholder="Full name"
            value={staffForm.fullName}
            onChange={(e) =>
              setStaffForm((prev) => ({ ...prev, fullName: e.target.value }))
            }
          />
          <Input
            type="email"
            placeholder="Email"
            value={staffForm.email}
            onChange={(e) =>
              setStaffForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          <Input
            type="text"
            placeholder="Phone (optional)"
            value={staffForm.phone}
            onChange={(e) =>
              setStaffForm((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={
                staffForm.id
                  ? "Set a new password (optional)"
                  : "Temporary password"
              }
              value={staffForm.password}
              onChange={(e) =>
                setStaffForm((prev) => ({ ...prev, password: e.target.value }))
              }
            />
            <p className="text-xs text-cocoa/60">
              {staffForm.id
                ? "Leave this empty if you don't want to change the current password. Minimum 6 characters if you do."
                : "Use at least 6 characters for the temporary password."}
            </p>
          </div>
          <SelectMenu
            value={staffForm.role}
            onChange={(value) => setStaffForm((prev) => ({ ...prev, role: value }))}
            className="w-40"
            menuClassName="w-44"
            options={[
              { label: "Staff", value: "Staff" },
              { label: "Admin", value: "Admin" },
            ]}
          />
          <div className="space-y-2">
            <p className="text-xs uppercase text-cocoa/60">Permissions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {staffPermissionOptions.map((perm) => (
                <label
                  key={perm.value}
                  className="flex items-center gap-2 rounded-xl2 border border-gold/15 bg-obsidian/60 px-3 py-2 text-xs text-cocoa/70"
                >
                  <input
                    type="checkbox"
                    className="accent-gold"
                    checked={staffForm.permissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>
          {staffError && <p className="form-error">{staffError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1 justify-center" disabled={staffSaving}>
              {staffSaving
                ? "Saving..."
                : staffForm.id
                  ? "Update Staff"
                  : "Add Staff"}
            </Button>
            {staffForm.id && (
              <Button type="button" variant="secondary" onClick={resetStaffForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className={dashboardPanelClass}>
        <DashboardSectionHeading
          eyebrow="Team Directory"
          title="Team"
          description={`${staffList.length} staff account${staffList.length === 1 ? "" : "s"} available for access management.`}
        />
        <div className="mt-4 space-y-3 text-sm">
          {staffList.map((member) => (
            <div key={member.id} className={dashboardItemClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-espresso">
                    {member.fullName || "Staff member"}
                  </p>
                  <p className="break-all text-xs text-cocoa/60">{member.email}</p>
                  {member.phone && (
                    <p className="break-all text-xs text-cocoa/60">{member.phone}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <Badge>{member.role}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(member.permissions || []).length === 0 && member.role !== "Admin" && (
                  <span className="text-xs text-cocoa/50">No permissions</span>
                )}
                {(member.permissions || []).map((perm) => (
                  <Badge key={perm} variant="secondary">
                    {permissionMap.get(perm) || perm}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setStaffForm({
                      id: member.id,
                      fullName: member.fullName || "",
                      email: member.email || "",
                      phone: member.phone || "",
                      role: member.role || "Staff",
                      password: "",
                      permissions: member.permissions || [],
                    })
                  }
                >
                  Edit
                </Button>
                <Button variant="outline" onClick={() => handleStaffDelete(member)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {staffList.length === 0 && (
            <p className="text-sm text-cocoa/60">No staff accounts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
