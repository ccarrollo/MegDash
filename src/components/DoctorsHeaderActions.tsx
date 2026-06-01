"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FacilityRow } from "@/lib/types";

export function DoctorsHeaderActions({ facilities }: { facilities: FacilityRow[] }) {
  const router = useRouter();
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityCity, setFacilityCity] = useState("");
  const [facilityLocation, setFacilityLocation] = useState("");

  const [facilityQuery, setFacilityQuery] = useState("");
  const [doctorFacilityId, setDoctorFacilityId] = useState(facilities[0]?.id ?? "");
  const [doctorName, setDoctorName] = useState("");
  const [doctorFocus, setDoctorFocus] = useState("");
  const [doctorStatus, setDoctorStatus] = useState("2. Introduced");

  const filteredFacilities = useMemo(() => {
    const q = facilityQuery.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) =>
      `${f.name} ${f.address}`.toLowerCase().includes(q),
    );
  }, [facilityQuery, facilities]);

  async function addFacility() {
    if (!facilityName.trim() || !facilityAddress.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: facilityName.trim(),
          address: facilityAddress.trim(),
          city: facilityCity.trim() || null,
          locationLabel: facilityLocation.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; facility?: { id: string } };
      if (!res.ok) throw new Error(data.error ?? "Could not add facility");
      setFacilityName("");
      setFacilityAddress("");
      setFacilityCity("");
      setFacilityLocation("");
      setShowFacilityForm(false);
      setMessage("Facility added.");
      if (data.facility?.id) setDoctorFacilityId(data.facility.id);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add facility.");
    } finally {
      setSaving(false);
    }
  }

  async function addDoctor() {
    if (!doctorFacilityId || !doctorName.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: doctorFacilityId,
          name: doctorName.trim(),
          primaryFocus: doctorFocus.trim() || null,
          status: doctorStatus,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add doctor");
      setDoctorName("");
      setDoctorFocus("");
      setShowDoctorForm(false);
      setMessage("Doctor added.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add doctor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border border-violet-300 px-3 py-1.5 text-sm text-violet-900 dark:border-slate-600 dark:text-slate-200"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setShowFacilityForm((v) => !v)}
          className="rounded border border-brand-400 px-3 py-1.5 text-sm text-brand-700"
        >
          {showFacilityForm ? "Cancel facility" : "+ Add Facility"}
        </button>
        <button
          type="button"
          onClick={() => setShowDoctorForm((v) => !v)}
          className="rounded border border-brand-400 px-3 py-1.5 text-sm text-brand-700"
        >
          {showDoctorForm ? "Cancel doctor" : "+ Add Doctor"}
        </button>
      </div>

      {message && <p className="mt-2 text-xs text-violet-700 dark:text-slate-400">{message}</p>}

      {showFacilityForm && (
        <div className="mt-3 grid gap-2 border-t border-violet-100 pt-3 dark:border-slate-800">
          <p className="text-xs font-medium text-violet-700 dark:text-slate-400">Add facility</p>
          <input className="rounded border px-3 py-2 text-sm" placeholder="Facility name" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Address" value={facilityAddress} onChange={(e) => setFacilityAddress(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="City (optional)" value={facilityCity} onChange={(e) => setFacilityCity(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Location label (optional)" value={facilityLocation} onChange={(e) => setFacilityLocation(e.target.value)} />
          <button type="button" disabled={saving} onClick={() => void addFacility()} className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Save facility
          </button>
        </div>
      )}

      {showDoctorForm && (
        <div className="mt-3 grid gap-2 border-t border-violet-100 pt-3 dark:border-slate-800">
          <p className="text-xs font-medium text-violet-700 dark:text-slate-400">Add doctor</p>
          <input className="rounded border px-3 py-2 text-sm" placeholder="Search facilities…" value={facilityQuery} onChange={(e) => setFacilityQuery(e.target.value)} />
          <select value={doctorFacilityId} onChange={(e) => setDoctorFacilityId(e.target.value)} className="rounded border px-3 py-2 text-sm">
            {filteredFacilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.address}
              </option>
            ))}
          </select>
          <input className="rounded border px-3 py-2 text-sm" placeholder="Doctor name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Primary focus" value={doctorFocus} onChange={(e) => setDoctorFocus(e.target.value)} />
          <select value={doctorStatus} onChange={(e) => setDoctorStatus(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option>1. Active</option>
            <option>2. Introduced</option>
            <option>3. Got Card Only</option>
            <option>4. No Card, FWD info</option>
            <option>8. Target</option>
            <option>9. Archived</option>
          </select>
          <button type="button" disabled={saving} onClick={() => void addDoctor()} className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Save doctor
          </button>
        </div>
      )}
    </section>
  );
}

