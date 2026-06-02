const PATIENT_PREFIX = "Patient: ";

/** Encode fitting details in label when dedicated DB columns are unavailable. */
export function buildFittingAnchorLabel(input: {
  label?: string | null;
  patientName?: string | null;
  manualAddress?: string | null;
}): string | null {
  const parts: string[] = [];
  const note = input.label?.trim();
  if (note) parts.push(note);
  const patient = input.patientName?.trim();
  if (patient) parts.push(`${PATIENT_PREFIX}${patient}`);
  const addr = input.manualAddress?.trim();
  if (addr) parts.push(addr);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function parseFittingAnchorLabel(label: string | null | undefined): {
  note: string | null;
  patientName: string | null;
  manualAddress: string | null;
} {
  if (!label?.trim()) {
    return { note: null, patientName: null, manualAddress: null };
  }

  const parts = label.split(" · ").map((p) => p.trim()).filter(Boolean);
  let patientName: string | null = null;
  let manualAddress: string | null = null;
  const notes: string[] = [];

  for (const part of parts) {
    if (part.startsWith(PATIENT_PREFIX)) {
      patientName = part.slice(PATIENT_PREFIX.length).trim() || null;
    } else if (patientName && !manualAddress) {
      manualAddress = part;
    } else {
      notes.push(part);
    }
  }

  return {
    note: notes.length ? notes.join(" · ") : null,
    patientName,
    manualAddress,
  };
}

export function resolveFittingFields(anchor: {
  anchor_type: string;
  label?: string | null;
  patient_name?: string | null;
  manual_address?: string | null;
}): {
  label: string | null;
  patientName: string | null;
  manualAddress: string | null;
} {
  if (anchor.anchor_type !== "fitting") {
    return {
      label: anchor.label ?? null,
      patientName: anchor.patient_name ?? null,
      manualAddress: anchor.manual_address ?? null,
    };
  }

  const patientName = anchor.patient_name?.trim() || null;
  const manualAddress = anchor.manual_address?.trim() || null;
  if (patientName || manualAddress) {
    return {
      label: anchor.label ?? null,
      patientName,
      manualAddress,
    };
  }

  const parsed = parseFittingAnchorLabel(anchor.label);
  const hasParsedDetails = Boolean(parsed.patientName || parsed.manualAddress);
  return {
    label: parsed.note ?? (hasParsedDetails ? null : anchor.label ?? null),
    patientName: parsed.patientName,
    manualAddress: parsed.manualAddress,
  };
}
