"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DETAIL_GROUPS = [
  {
    title: "High-Value Wins",
    options: [
      {
        value: "commitment_to_prescribe",
        label: "Commitment to Prescribe",
      },
      {
        value: "clinical_data_pitched",
        label: "Clinical Data Pitched",
      },
      {
        value: "staff_inservice_portal_training",
        label: "Staff In-Service / Portal Training",
      },
    ],
  },
  {
    title: "Pipeline & Administrative Maintenance",
    options: [
      {
        value: "pending_order_documentation_followup",
        label: "Pending Order / Documentation Follow-up",
      },
      {
        value: "staff_gatekeeper_touchpoint",
        label: "Staff / Gatekeeper Touchpoint",
      },
      {
        value: "literature_brochures_left",
        label: "Literature / Patient Brochures Left",
      },
    ],
  },
  {
    title: "Friction & Blockers",
    options: [
      {
        value: "doctor_unavailable_no_contact",
        label: "Doctor Unavailable / No Contact",
      },
      {
        value: "competitor_locked",
        label: "Competitor-Locked",
      },
      {
        value: "payer_insurance_restriction",
        label: "Payer / Insurance Restriction",
      },
    ],
  },
] as const;

export function LogVisitForm({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inPersonVisit, setInPersonVisit] = useState(false);
  const [remoteContact, setRemoteContact] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Record<string, boolean>>({});

  const selectedDetailCount = Object.values(details).filter(Boolean).length;
  const selectedOutcomes = [
    inPersonVisit ? "in_person_visit" : null,
    remoteContact ? "remote_contact" : null,
    ...Object.entries(details)
      .filter(([, checked]) => checked)
      .map(([value]) => value),
  ].filter(Boolean) as string[];

  async function log() {
    if (selectedOutcomes.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, outcomes: selectedOutcomes }),
      });
      const data = (await res.json()) as {
        createdOrder?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.createdOrder) {
        alert("Order logged — check Sales & Orders tab.");
      }
      setInPersonVisit(false);
      setRemoteContact(false);
      setDetails({});
      setShowDetails(false);
      router.refresh();
    } catch {
      alert("Could not log visit. Is Supabase connected?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
        >
          <input
            type="checkbox"
            checked={inPersonVisit}
            onChange={(e) => setInPersonVisit(e.target.checked)}
          />
          In-person Visit
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={remoteContact}
            onChange={(e) => setRemoteContact(e.target.checked)}
          />
          Phone / Text / Email Interaction
        </label>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-brand-600 hover:underline"
        >
          {showDetails ? "Hide detail" : selectedDetailCount > 0 ? `Add detail (${selectedDetailCount})` : "Add detail"}
        </button>
        <button
          type="button"
          disabled={loading || selectedOutcomes.length === 0}
          onClick={log}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {showDetails && (
        <div className="mt-3 space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          {DETAIL_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {group.title}
              </p>
              <div className="mt-2 grid gap-2">
                {group.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(details[option.value])}
                      onChange={(e) =>
                        setDetails((prev) => ({
                          ...prev,
                          [option.value]: e.target.checked,
                        }))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        In-person Visit resets both days since visit and days since contact. Phone/Text/Email resets days since contact only.
      </p>
    </div>
  );
}
