import { AnchorsTabClient } from "@/components/AnchorsTabClient";
import { SetupBanner } from "@/components/SetupBanner";
import { mergeLunchAnchors } from "@/lib/anchors";
import { buildAnchorHistory } from "@/lib/anchorSchedule";
import { parsePlanDate } from "@/lib/dateUtils";
import {
  enrichAnchors,
  fetchAllDayAnchors,
  fetchAllLunches,
  fetchDayAnchors,
  fetchDoctors,
  fetchFacilities,
  fetchFittingExclusions,
  fetchFittingsOnDate,
  fetchLunchesOnDate,
  getSetupStatus,
} from "@/lib/data";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function AnchorsPage({ searchParams }: Props) {
  const setup = getSetupStatus();
  const { date } = await searchParams;
  const planDate = parsePlanDate(date);

  const [
    rawAnchors,
    lunchesOnDate,
    doctors,
    facilities,
    allLunches,
    allDbAnchors,
    fittingExclusions,
  ] = await Promise.all([
    fetchDayAnchors(planDate),
    fetchLunchesOnDate(planDate),
    fetchDoctors(),
    fetchFacilities(),
    fetchAllLunches(),
    fetchAllDayAnchors(),
    fetchFittingExclusions(planDate),
  ]);

  const fittingsOnDate = await fetchFittingsOnDate(planDate, fittingExclusions);
  const anchorsForDay = enrichAnchors(
    mergeLunchAnchors(
      rawAnchors,
      lunchesOnDate,
      fittingsOnDate,
      doctors,
      planDate,
      fittingExclusions,
    ),
    doctors,
  );
  const history = buildAnchorHistory(allLunches, allDbAnchors, doctors);

  return (
    <div className="space-y-4">
      {!setup.supabase && <SetupBanner />}
      <AnchorsTabClient
        planDate={planDate}
        anchors={anchorsForDay}
        history={history}
        doctors={doctors}
        facilities={facilities}
      />
    </div>
  );
}

