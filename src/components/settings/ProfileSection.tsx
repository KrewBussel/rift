"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  CardSection,
  FieldRow,
  TextInput,
  SelectInput,
  Btn,
  Pill,
  SETTINGS_TOKENS,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";

const T = SETTINGS_TOKENS;

const ROLE_HUE: Record<string, "violet" | "blue" | "green"> = {
  ADMIN: "violet",
  ADVISOR: "blue",
  OPS: "green",
};
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ADVISOR: "Advisor",
  OPS: "Operations",
};

const TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "America/Los_Angeles", label: "Los Angeles · UTC−8" },
  { value: "America/Denver",      label: "Denver · UTC−7" },
  { value: "America/Chicago",     label: "Chicago · UTC−6" },
  { value: "America/New_York",    label: "New York · UTC−5" },
  { value: "America/Phoenix",     label: "Phoenix · UTC−7" },
  { value: "America/Anchorage",   label: "Anchorage · UTC−9" },
  { value: "Pacific/Honolulu",    label: "Honolulu · UTC−10" },
  { value: "Europe/London",       label: "London · UTC+0" },
  { value: "UTC",                 label: "UTC" },
];

export type ProfileUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  bio: string | null;
  emailSignature: string | null;
  createdAt: string;
  preferences: { timezone?: string } & Record<string, unknown>;
};

export default function ProfileSection({
  user,
  registerSave,
}: {
  user: ProfileUser;
  registerSave: (id: string, dirty: boolean, save: () => Promise<void> | void, reset: () => void) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [emailSignature, setEmailSignature] = useState(user.emailSignature ?? "");
  const [timezone, setTimezone] = useState<string>(user.preferences.timezone ?? "America/Los_Angeles");
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarErrored, setAvatarErrored] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty =
    firstName !== user.firstName ||
    lastName !== user.lastName ||
    bio !== (user.bio ?? "") ||
    emailSignature !== (user.emailSignature ?? "") ||
    timezone !== (user.preferences.timezone ?? "America/Los_Angeles");

  registerSave(
    "profile",
    isDirty,
    async () => {
      if (!firstName.trim() || !lastName.trim()) throw new Error("First and last name are required.");
      const profileRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          bio: bio.trim() || null,
          emailSignature: emailSignature.trim() || null,
        }),
      });
      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save profile.");
      }
      if (timezone !== (user.preferences.timezone ?? "America/Los_Angeles")) {
        const prefsRes = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: { ...user.preferences, timezone } }),
        });
        if (!prefsRes.ok) {
          const data = await prefsRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save timezone.");
        }
      }
    },
    () => {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setBio(user.bio ?? "");
      setEmailSignature(user.emailSignature ?? "");
      setTimezone(user.preferences.timezone ?? "America/Los_Angeles");
    }
  );

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/avatar", { method: "POST", body: fd });
    setAvatarUploading(false);
    if (res.ok) {
      setAvatarErrored(false);
      setAvatarVersion(Date.now());
      setAvatarMessage({ type: "success", text: "Photo updated." });
    } else {
      const data = await res.json().catch(() => ({}));
      setAvatarMessage({ type: "error", text: data.error ?? "Upload failed." });
    }
    e.target.value = "";
  }

  return (
    <div>
      <SectionHeader
        title="Profile"
        description="Your name, contact info, and how you appear to clients and teammates."
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 880 }}>
        <CardSection title="Photo" description="Shown in case avatars, mentions, and the team list.">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <label style={{ position: "relative", flexShrink: 0, cursor: "pointer" }} title="Change photo">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
              {!avatarErrored ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={avatarVersion}
                  src={`/api/users/me/avatar?v=${avatarVersion}`}
                  alt={`${firstName} ${lastName}`}
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `1px solid ${T.borderStrong}` }}
                  onError={() => setAvatarErrored(true)}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: T.accent,
                    color: T.page,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 700,
                    border: `1px solid ${T.surface2}`,
                  }}
                >
                  {firstName.charAt(0).toUpperCase()}
                  {lastName.charAt(0).toUpperCase()}
                </div>
              )}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn>{avatarUploading ? "Uploading…" : "Upload photo"}</Btn>
              <Btn ghost>Remove</Btn>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, color: T.textTertiary }}>
              {avatarMessage ? (
                <span style={{ color: avatarMessage.type === "success" ? T.success : T.danger }}>{avatarMessage.text}</span>
              ) : (
                "JPG or PNG, up to 2 MB."
              )}
            </div>
          </div>
        </CardSection>

        <CardSection title="Personal info">
          <FieldRow label="Legal name" hint="Used on signed paperwork.">
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <TextInput value={firstName} onChange={setFirstName} placeholder="First" required />
              <TextInput value={lastName} onChange={setLastName} placeholder="Last" required />
            </div>
          </FieldRow>
          <FieldRow label="Email" hint="Login email — managed by your firm admin.">
            <TextInput value={user.email} onChange={() => {}} readOnly type="email" />
          </FieldRow>
          <FieldRow label="Bio" hint="Shown to clients on the portal when you're their assigned advisor.">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="e.g. CFP® with 10 years helping retirees navigate rollovers."
              rows={3}
              style={{
                width: "100%",
                background: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "8px 10px",
                color: T.text,
                fontSize: 13,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </FieldRow>
          <FieldRow label="Email signature" hint="Appended to client portal invites and reminders." isLast>
            <textarea
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value.slice(0, 2000))}
              placeholder={"Sarah Mitchell\nSummit Wealth Partners\n(555) 123-4567"}
              rows={4}
              style={{
                width: "100%",
                background: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "8px 10px",
                color: T.text,
                fontSize: 13,
                fontFamily: "ui-monospace, monospace",
                resize: "vertical",
                outline: "none",
              }}
            />
          </FieldRow>
        </CardSection>

        <CardSection title="Preferences" description="How Rift is tailored to you.">
          <FieldRow label="Timezone" hint="Affects timestamps and digest delivery." isLast>
            <SelectInput value={timezone} onChange={setTimezone} options={TIMEZONES} style={{ maxWidth: 280 }} />
          </FieldRow>
        </CardSection>

        <CardSection title="Account" description="Read-only. Contact an admin to change.">
          <FieldRow label="Joined">
            <span style={{ fontSize: 13, color: T.textSecondary }}>{formatDate(user.createdAt)}</span>
          </FieldRow>
          <FieldRow label="Role" isLast>
            <Pill hue={ROLE_HUE[user.role] ?? "slate"}>{ROLE_LABEL[user.role] ?? user.role}</Pill>
          </FieldRow>
        </CardSection>
      </div>

    </div>
  );
}
