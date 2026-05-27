export type TerritoryZone =
  | "austin_core"
  | "north_nw"
  | "south_i35"
  | "east"
  | "waco_central"
  | "west_rural"
  | "unknown";

export type DoctorRow = {
  id: string;
  facility_id: string;
  name: string;
  primary_focus: string | null;
  status: string;
  priority: string;
  decision_makers: string | null;
  lunch_scheduled: boolean;
  lunch_date: string | null;
  follow_up_date: string | null;
  facility_name: string;
  address: string;
  city: string | null;
  location_label: string | null;
  zone: TerritoryZone;
  lat: number | null;
  lng: number | null;
  last_visit_at: string | null;
  days_since_visit: number | null;
};

export type PlannedStop = {
  doctorId: string;
  doctorName: string;
  facilityName: string;
  address: string;
  zone: TerritoryZone;
  reason: string;
  kind: "lunch" | "visit" | "follow_up";
  score: number;
};
