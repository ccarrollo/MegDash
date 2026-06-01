"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DoctorRow, FacilityRow } from "@/lib/types";

export function ManualAddForms({
  facilities,
  doctors,
}: {
  facilities: FacilityRow[];
  doctors: DoctorRow[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityCity, setFacilityCity] = useState("");
  const [facilityLocation, setFacilityLocation] = useState("");

  const [doctorFacilityId, setDoctorFacilityId] = useState(facilities[0]?.id ?? "");
  const [doctorFacilityQuery, setDoctorFacilityQuery] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorFocus, setDoctorFocus] = useState("");
  const [doctorStatus, setDoctorStatus] = useState("2. Introduced");
  const [doctorFollowup, setDoctorFollowup] = useState("");

  const [lunchDoctorId, setLunchDoctorId] = useState(doctors[0]?.id ?? "");
  const [lunchDoctorQuery, setLunchDoctorQuery] = useState("");
  const [lunchDate, setLunchDate] = useState("");
  const [lunchTime, setLunchTime] = useState("12:00");
  const [lunchOrder, setLunchOrder] = useState("");
  const [lunchNotes, setLunchNotes] = useState("");

  useEffect(() => {
    if (
      (!doctorFacilityId || !facilities.some((f) => f.id === doctorFacilityId)) &&
      facilities[0]?.id
    ) {
      setDoctorFacilityId(facilities[0].id);
    }
  }, [doctorFacilityId, facilities]);

  useEffect(() => {
    if (
      (!lunchDoctorId || !doctors.some((d) => d.id === lunchDoctorId)) &&
      doctors[0]?.id
    ) {
      setLunchDoctorId(doctors[0].id);
    }
  }, [lunchDoctorId, doctors]);

  const filteredFacilities = useMemo(() => {
    const q = doctorFacilityQuery.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) =>
      `${f.name} ${f.address}`.toLowerCase().includes(q),
    );
  }, [doctorFacilityQuery, facilities]);

  const filteredDoctors = useMemo(() => {
    const q = lunchDoctorQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      `${d.name} ${d.facility_name}`.toLowerCase().includes(q),
    );
  }, [lunchDoctorQuery, doctors]);

  async function addFacility() {
    if (!facilityName || !facilityAddress) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: facilityName,
          address: facilityAddress,
          city: facilityCity || null,
          locationLabel: facilityLocation || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to add facility");
      }
      const data = (await res.json()) as { facility?: { id: string } };
      setFacilityName("");
      setFacilityAddress("");
      setFacilityCity("");
      setFacilityLocation("");
      if (data.facility?.id) {
        setDoctorFacilityId(data.facility.id);
      }
      setMsg("Facility added.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not add facility.");
    } finally {
      setLoading(false);
    }
  }

  async function addDoctor() {
    if (!doctorFacilityId || !doctorName) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: doctorFacilityId,
          name: doctorName,
          primaryFocus: doctorFocus || null,
          status: doctorStatus,
          followUpDate: doctorFollowup || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to add doctor");
      }
      const data = (await res.json()) as { doctor?: { id: string } };
      setDoctorName("");
      setDoctorFocus("");
      setDoctorFollowup("");
      if (data.doctor?.id) {
        setLunchDoctorId(data.doctor.id);
      }
      setMsg("Doctor added.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not add doctor.");
    } finally {
      setLoading(false);
    }
  }

  async function addLunch() {
    if (!lunchDoctorId || !lunchDate) return;
    setLoading(true);
    setMsg("");
    try {
      const doctor = doctors.find((d) => d.id === lunchDoctorId);
      const res = await fetch("/api/lunches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: lunchDoctorId,
          facilityId: doctor?.facility_id ?? null,
          lunchDate,
          startTime: lunchTime,
          lunchOrder: lunchOrder || null,
          foodNotes: lunchNotes || null,
          status: "scheduled",
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to add lunch");
      }
      setLunchDate("");
      setLunchTime("12:00");
      setLunchOrder("");
      setLunchNotes("");
      setMsg("Lunch added.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not add lunch.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-violet-800 dark:text-slate-400">{msg}</p>}

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Add facility</h2>
        <div className="mt-2 grid gap-2">
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Facility name"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Address"
            value={facilityAddress}
            onChange={(e) => setFacilityAddress(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="City (optional)"
            value={facilityCity}
            onChange={(e) => setFacilityCity(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Location label (optional)"
            value={facilityLocation}
            onChange={(e) => setFacilityLocation(e.target.value)}
          />
          <button
            type="button"
            disabled={loading}
            onClick={addFacility}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save facility
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Add doctor</h2>
        <div className="mt-2 grid gap-2">
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Search facilities…"
            value={doctorFacilityQuery}
            onChange={(e) => setDoctorFacilityQuery(e.target.value)}
          />
          <select
            value={doctorFacilityId}
            onChange={(e) => setDoctorFacilityId(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            {filteredFacilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.address}
              </option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Doctor name"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Primary focus"
            value={doctorFocus}
            onChange={(e) => setDoctorFocus(e.target.value)}
          />
          <select
            value={doctorStatus}
            onChange={(e) => setDoctorStatus(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option>1. Active</option>
            <option>2. Introduced</option>
            <option>3. Got Card Only</option>
            <option>4. No Card, FWD info</option>
            <option>8. Target</option>
            <option>9. Archived</option>
          </select>
          <input
            type="date"
            className="rounded border px-3 py-2 text-sm"
            value={doctorFollowup}
            onChange={(e) => setDoctorFollowup(e.target.value)}
          />
          <button
            type="button"
            disabled={loading}
            onClick={addDoctor}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save doctor
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Add lunch</h2>
        <div className="mt-2 grid gap-2">
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Search doctors…"
            value={lunchDoctorQuery}
            onChange={(e) => setLunchDoctorQuery(e.target.value)}
          />
          <select
            value={lunchDoctorId}
            onChange={(e) => setLunchDoctorId(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            {filteredDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.facility_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={lunchDate}
            onChange={(e) => setLunchDate(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={lunchTime}
            onChange={(e) => setLunchTime(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Lunch order"
            value={lunchOrder}
            onChange={(e) => setLunchOrder(e.target.value)}
          />
          <textarea
            className="rounded border px-3 py-2 text-sm"
            placeholder="Food / dietary notes"
            rows={2}
            value={lunchNotes}
            onChange={(e) => setLunchNotes(e.target.value)}
          />
          <button
            type="button"
            disabled={loading}
            onClick={addLunch}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save lunch
          </button>
        </div>
      </section>
    </div>
  );
}
