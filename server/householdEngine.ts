import type {
  HouseholdAnomaly,
  HouseholdMonthlyComparison,
  HouseholdMonthlyRecord,
  HouseholdPersonalizedTip,
  HouseholdProfile,
} from '../src/types/household';

function roundOne(val: number): number {
  return Math.round(val * 10) / 10;
}

function pctChange(curr: number, base: number): number | null {
  if (base === 0) return curr === 0 ? 0 : null;
  return roundOne(((curr - base) / base) * 100);
}

export function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const date = new Date(year, monthIdx, 1);
  if (Number.isNaN(date.getTime())) return monthStr;
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function runHouseholdDeterministicAnalysis(profile: HouseholdProfile): {
  sortedProfile: HouseholdProfile;
  latestMonth: HouseholdMonthlyComparison;
  historicalAverages: {
    electricityKwh: number;
    waterLitres: number;
    wasteGeneratedKg: number;
    wasteRecycledKg: number;
    recyclingRatePct: number;
  };
  latestVsAveragePct: {
    electricityPct: number;
    waterPct: number;
    wastePct: number;
    recyclingRateDiffPp: number;
  };
  monthlyComparisons: HouseholdMonthlyComparison[];
  anomalies: HouseholdAnomaly[];
  personalizedSuggestions: HouseholdPersonalizedTip[];
  summaryText: string;
} {
  const sortedRecords: HouseholdMonthlyRecord[] = [...profile.records]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({
      ...r,
      label: r.label || formatMonthLabel(r.month),
    }));

  const sortedProfile: HouseholdProfile = {
    ...profile,
    records: sortedRecords,
  };

  const monthlyComparisons: HouseholdMonthlyComparison[] = sortedRecords.map((rec, idx) => {
    const prev = idx > 0 ? sortedRecords[idx - 1] : null;
    const recyclingRatePct =
      rec.wasteGeneratedKg > 0
        ? roundOne((rec.wasteRecycledKg / rec.wasteGeneratedKg) * 100)
        : 0;

    return {
      month: rec.month,
      label: rec.label,
      electricityKwh: rec.electricityKwh,
      waterLitres: rec.waterLitres,
      wasteGeneratedKg: rec.wasteGeneratedKg,
      wasteRecycledKg: rec.wasteRecycledKg,
      recyclingRatePct,
      electricityMomPct: prev ? pctChange(rec.electricityKwh, prev.electricityKwh) : null,
      waterMomPct: prev ? pctChange(rec.waterLitres, prev.waterLitres) : null,
      wasteMomPct: prev ? pctChange(rec.wasteGeneratedKg, prev.wasteGeneratedKg) : null,
    };
  });

  const latest = monthlyComparisons[monthlyComparisons.length - 1];
  const latestRec = sortedRecords[sortedRecords.length - 1];
  const prevRec = sortedRecords.length > 1 ? sortedRecords[sortedRecords.length - 2] : null;

  // Compute historical baseline averages from prior months (or all months if only 1)
  const baselinePool =
    monthlyComparisons.length > 1 ? monthlyComparisons.slice(0, -1) : monthlyComparisons;
  const count = baselinePool.length;

  const avgElectricity = roundOne(
    baselinePool.reduce((sum, m) => sum + m.electricityKwh, 0) / count
  );
  const avgWater = Math.round(
    baselinePool.reduce((sum, m) => sum + m.waterLitres, 0) / count
  );
  const avgWaste = roundOne(
    baselinePool.reduce((sum, m) => sum + m.wasteGeneratedKg, 0) / count
  );
  const avgRecycled = roundOne(
    baselinePool.reduce((sum, m) => sum + m.wasteRecycledKg, 0) / count
  );
  const avgRecyclingRate =
    avgWaste > 0 ? roundOne((avgRecycled / avgWaste) * 100) : 0;

  const historicalAverages = {
    electricityKwh: avgElectricity,
    waterLitres: avgWater,
    wasteGeneratedKg: avgWaste,
    wasteRecycledKg: avgRecycled,
    recyclingRatePct: avgRecyclingRate,
  };

  const elecVsAvg = pctChange(latest.electricityKwh, avgElectricity) ?? 0;
  const waterVsAvg = pctChange(latest.waterLitres, avgWater) ?? 0;
  const wasteVsAvg = pctChange(latest.wasteGeneratedKg, avgWaste) ?? 0;
  const recyclingDiffPp = roundOne(latest.recyclingRatePct - avgRecyclingRate);

  const latestVsAveragePct = {
    electricityPct: elecVsAvg,
    waterPct: waterVsAvg,
    wastePct: wasteVsAvg,
    recyclingRateDiffPp: recyclingDiffPp,
  };

  const anomalies: HouseholdAnomaly[] = [];
  let anomalyNum = 1;
  const nextId = () => `HH-A${String(anomalyNum++).padStart(2, '0')}`;

  if (sortedRecords.length >= 2) {
    // 1. Electricity anomaly check (+/- 20% vs average or +/- 25% MoM)
    const elecMom = latest.electricityMomPct;
    if (
      Math.abs(elecVsAvg) >= 20 ||
      (elecMom !== null && Math.abs(elecMom) >= 25)
    ) {
      const isIncrease = elecVsAvg >= 0;
      const absVsAvg = Math.abs(elecVsAvg);
      const attentionLevel = absVsAvg >= 35 ? 'Notable' : 'Moderate';
      anomalies.push({
        id: nextId(),
        month: latest.month,
        monthLabel: latest.label,
        metric: 'Electricity',
        unit: 'kWh',
        direction: isIncrease ? 'Unusual Increase' : 'Unusual Decrease',
        attentionLevel,
        currentValue: latest.electricityKwh,
        previousMonthValue: prevRec ? prevRec.electricityKwh : null,
        historicalAverageValue: avgElectricity,
        momPercentChange: elecMom,
        vsAveragePercentChange: elecVsAvg,
        numericalSummary: `${latest.electricityKwh.toLocaleString()} kWh in ${latest.label} vs. ${prevRec?.electricityKwh.toLocaleString() ?? 'N/A'} kWh prior month (${elecMom !== null ? `${elecMom > 0 ? '+' : ''}${elecMom}% MoM` : 'N/A'}) and ${avgElectricity.toLocaleString()} kWh historical average (${elecVsAvg > 0 ? '+' : ''}${elecVsAvg}%).`,
        explanation: isIncrease
          ? `Electricity usage rose to ${latest.electricityKwh} kWh, which is ${absVsAvg}% above your prior ${count}-month average of ${avgElectricity} kWh.${latestRec.contextNote ? ` Noted context: "${latestRec.contextNote}".` : ''} Higher electricity usage in a single month commonly stems from seasonal heating or cooling loads, extra occupants, or billing cycle adjustments rather than any error.`
          : `Electricity usage dropped to ${latest.electricityKwh} kWh, which is ${absVsAvg}% below your prior ${count}-month average of ${avgElectricity} kWh.${latestRec.contextNote ? ` Noted context: "${latestRec.contextNote}".` : ''} Sharp reductions often happen when residents travel away from home, switch off HVAC systems between seasons, or receive an estimated utility reading.`,
        possibleReasons: isIncrease
          ? [
              'Seasonal shift requiring higher space heating, electric water heating, or air conditioning runtime.',
              'Temporary increase in household occupancy (visiting guests or working from home more days).',
              'Aging or malfunctioning appliance (such as a refrigerator compressor, pool pump, or electric heater).',
              'Utility catch-up billing after an earlier month used an underestimated meter reading.',
            ]
          : [
              'Extended travel or fewer days spent at home during the billing period.',
              'Mild transitional weather reducing both heating and cooling demand.',
              'Recent upgrade to energy-efficient appliances, LED lighting, or smart thermostat schedules.',
              'Estimated meter reading that undercounts actual consumption until the next physical read.',
            ],
        practicalChecks: isIncrease
          ? [
              'Check whether your utility bill reflects an actual meter read vs. an estimated catch-up bill.',
              'Review thermostat schedules and inspect high-draw appliances (water heater, HVAC filters, fridge seals).',
            ]
          : [
              'Confirm on your utility statement whether the reading was estimated or actual.',
              'Track next month’s usage to see whether the lower consumption level is sustained.',
            ],
      });
    }

    // 2. Water consumption anomaly check (+/- 20% vs average or +/- 25% MoM)
    const waterMom = latest.waterMomPct;
    if (
      Math.abs(waterVsAvg) >= 20 ||
      (waterMom !== null && Math.abs(waterMom) >= 25)
    ) {
      const isIncrease = waterVsAvg >= 0;
      const absVsAvg = Math.abs(waterVsAvg);
      const attentionLevel = absVsAvg >= 35 ? 'Notable' : 'Moderate';
      anomalies.push({
        id: nextId(),
        month: latest.month,
        monthLabel: latest.label,
        metric: 'Water',
        unit: 'litres',
        direction: isIncrease ? 'Unusual Increase' : 'Unusual Decrease',
        attentionLevel,
        currentValue: latest.waterLitres,
        previousMonthValue: prevRec ? prevRec.waterLitres : null,
        historicalAverageValue: avgWater,
        momPercentChange: waterMom,
        vsAveragePercentChange: waterVsAvg,
        numericalSummary: `${latest.waterLitres.toLocaleString()} L in ${latest.label} vs. ${prevRec?.waterLitres.toLocaleString() ?? 'N/A'} L prior month (${waterMom !== null ? `${waterMom > 0 ? '+' : ''}${waterMom}% MoM` : 'N/A'}) and ${avgWater.toLocaleString()} L historical average (${waterVsAvg > 0 ? '+' : ''}${waterVsAvg}%).`,
        explanation: isIncrease
          ? `Water consumption climbed to ${latest.waterLitres.toLocaleString()} litres—${absVsAvg}% higher than your ${avgWater.toLocaleString()}-litre baseline. In residential settings, a sudden rise is frequently caused by extra guests, garden irrigation, or a quiet plumbing leak such as a running toilet flapper.`
          : `Water consumption fell to ${latest.waterLitres.toLocaleString()} litres—${absVsAvg}% below your ${avgWater.toLocaleString()}-litre baseline. This typically reflects reduced outdoor watering, travel away from home, or fixture conservation upgrades.`,
        possibleReasons: isIncrease
          ? [
              'Undetected household leak (running toilet cistern, dripping outdoor tap, or irrigation valve).',
              'Additional laundry, dishwashing, and showering from visiting family or guests.',
              'Seasonal lawn/garden watering or filling a pool/hot tub.',
            ]
          : [
              'Reduced home occupancy due to travel or vacation days.',
              'End of summer garden irrigation or cooler weather.',
              'Installation of low-flow showerheads, tap aerators, or efficient washing machines.',
            ],
        practicalChecks: isIncrease
          ? [
              'Perform an overnight water meter test: read the meter before bed and again before anyone uses water in the morning.',
              'Check toilet tanks with a few drops of food coloring to spot silent flapper leaks.',
            ]
          : [
              'Verify water meter reading against your municipal bill to ensure it was not an estimate.',
            ],
      });
    }

    // 3. Waste generation anomaly check (+/- 22% vs average or +/- 25% MoM)
    const wasteMom = latest.wasteMomPct;
    if (
      Math.abs(wasteVsAvg) >= 22 ||
      (wasteMom !== null && Math.abs(wasteMom) >= 25)
    ) {
      const isIncrease = wasteVsAvg >= 0;
      const absVsAvg = Math.abs(wasteVsAvg);
      anomalies.push({
        id: nextId(),
        month: latest.month,
        monthLabel: latest.label,
        metric: 'Waste Generation',
        unit: 'kg',
        direction: isIncrease ? 'Unusual Increase' : 'Unusual Decrease',
        attentionLevel: absVsAvg >= 35 ? 'Notable' : 'Moderate',
        currentValue: latest.wasteGeneratedKg,
        previousMonthValue: prevRec ? prevRec.wasteGeneratedKg : null,
        historicalAverageValue: avgWaste,
        momPercentChange: wasteMom,
        vsAveragePercentChange: wasteVsAvg,
        numericalSummary: `${latest.wasteGeneratedKg} kg in ${latest.label} vs. ${prevRec?.wasteGeneratedKg ?? 'N/A'} kg prior month (${wasteMom !== null ? `${wasteMom > 0 ? '+' : ''}${wasteMom}% MoM` : 'N/A'}) and ${avgWaste} kg historical average (${wasteVsAvg > 0 ? '+' : ''}${wasteVsAvg}%).`,
        explanation: isIncrease
          ? `Total household waste reached ${latest.wasteGeneratedKg} kg, up ${absVsAvg}% compared to your ${avgWaste} kg historical average. Short-term household waste spikes commonly coincide with home cleanouts, deliveries with heavy packaging, or hosting gatherings.`
          : `Total household waste dropped to ${latest.wasteGeneratedKg} kg, down ${absVsAvg}% from your ${avgWaste} kg historical average, reflecting lower household throughput or reduced occupancy.`,
        possibleReasons: isIncrease
          ? [
              'Seasonal decluttering, garage cleanout, or minor home renovation.',
              'Increased online deliveries or bulk household purchases generating extra packaging.',
              'Hosting events, holidays, or extra household members.',
            ]
          : [
              'Fewer days spent at home or dining out more frequently during the month.',
              'Shift toward bulk refills, reusable containers, or home composting of food scraps.',
            ],
        practicalChecks: [
          'Separate bulky cleanout items or cardboard packaging from regular kitchen waste when logging.',
        ],
      });
    }

    // 4. Recycling rate shift (>= 12 percentage points drop or rise)
    if (Math.abs(recyclingDiffPp) >= 12) {
      const isIncrease = recyclingDiffPp > 0;
      anomalies.push({
        id: nextId(),
        month: latest.month,
        monthLabel: latest.label,
        metric: 'Waste Recycling Rate',
        unit: '%',
        direction: isIncrease ? 'Unusual Increase' : 'Unusual Decrease',
        attentionLevel: Math.abs(recyclingDiffPp) >= 18 ? 'Notable' : 'Low',
        currentValue: latest.recyclingRatePct,
        previousMonthValue: prevRec && prevRec.wasteGeneratedKg > 0
          ? roundOne((prevRec.wasteRecycledKg / prevRec.wasteGeneratedKg) * 100)
          : null,
        historicalAverageValue: avgRecyclingRate,
        momPercentChange: null,
        vsAveragePercentChange: recyclingDiffPp,
        numericalSummary: `${latest.recyclingRatePct}% recycled (${latest.wasteRecycledKg} kg of ${latest.wasteGeneratedKg} kg) vs. ${avgRecyclingRate}% historical average (${recyclingDiffPp > 0 ? '+' : ''}${recyclingDiffPp} percentage points).`,
        explanation: isIncrease
          ? `Your recycling rate rose to ${latest.recyclingRatePct}%, outperforming your historical average of ${avgRecyclingRate}% by ${recyclingDiffPp} percentage points.`
          : `Your recycling rate shifted down to ${latest.recyclingRatePct}%, which is ${Math.abs(recyclingDiffPp)} percentage points lower than your historical average of ${avgRecyclingRate}%. This often happens when non-recyclable general waste increases temporarily (such as food waste or mixed packaging) or when a recycling pickup was missed.`,
        possibleReasons: isIncrease
          ? [
              'Consistent sorting of paper, glass, metals, and rigid plastics.',
              'Higher volume of recyclable cardboard deliveries relative to general trash.',
            ]
          : [
              'Non-recyclable items (e.g., contaminated food packaging, yard debris, or cleanout waste) raised general trash weight.',
              'Missed kerbside recycling collection pushing recyclable bags into the following month.',
            ],
        practicalChecks: [
          'Check local municipal sorting rules for common contaminants like coated paper or soft plastics.',
        ],
      });
    }
  }

  // Personalized impact reduction suggestions tailored to household metrics
  const personalizedSuggestions: HouseholdPersonalizedTip[] = [];
  const perPersonElec = roundOne(latest.electricityKwh / Math.max(1, profile.occupants));
  const perPersonWater = Math.round(latest.waterLitres / Math.max(1, profile.occupants));

  if (elecVsAvg > 15 || perPersonElec > 130) {
    personalizedSuggestions.push({
      id: 'TIP-ELEC-1',
      domain: 'Electricity',
      priority: 'High Impact',
      title: 'Trim peak heating/cooling & standby loads',
      description: `At ${latest.electricityKwh} kWh (${perPersonElec} kWh per occupant), adjusting thermostat setpoints by 1–2°C and placing home-office/entertainment electronics on smart power strips can curb baseline draw.`,
      estimatedBenefit: 'Potential 8–15% monthly kWh reduction',
    });
  } else {
    personalizedSuggestions.push({
      id: 'TIP-ELEC-2',
      domain: 'Electricity',
      priority: 'Quick Win',
      title: 'Shift high-draw appliances to off-peak cycles',
      description:
        'Run dishwashers and laundry machines on cold-water eco cycles and avoid partial loads to keep electricity usage steady.',
      estimatedBenefit: 'Saves ~15–25 kWh per month',
    });
  }

  if (waterVsAvg > 15 || perPersonWater > 4000) {
    personalizedSuggestions.push({
      id: 'TIP-WATER-1',
      domain: 'Water',
      priority: 'High Impact',
      title: 'Check silent leaks & install low-flow aerators',
      description: `Your ${latest.label} intake (${latest.waterLitres.toLocaleString()} L, or ~${perPersonWater.toLocaleString()} L per person) is elevated. Checking toilet cisterns and fitting 6 L/min tap aerators quickly reduces unnecessary flow.`,
      estimatedBenefit: 'Potential 1,500–3,000 litres saved monthly',
    });
  } else {
    personalizedSuggestions.push({
      id: 'TIP-WATER-2',
      domain: 'Water',
      priority: 'Moderate Impact',
      title: 'Optimize outdoor watering and shower timers',
      description:
        'Water gardens early morning to minimize evaporation and shorten showers by 1–2 minutes to maintain low per-capita litre usage.',
      estimatedBenefit: 'Saves ~600–1,200 litres per month',
    });
  }

  if (latest.recyclingRatePct < 55 || recyclingDiffPp < -5) {
    personalizedSuggestions.push({
      id: 'TIP-WASTE-1',
      domain: 'Waste & Recycling',
      priority: 'High Impact',
      title: 'Divert kitchen organics and improve dry sorting',
      description: `With a ${latest.recyclingRatePct}% recycling rate (${latest.wasteGeneratedKg - latest.wasteRecycledKg} kg sent to general waste), setting up a dedicated kitchen compost caddy and rinsing recyclables can boost diversion substantially.`,
      estimatedBenefit: 'Can lift recycling rate by 10–18 percentage points',
    });
  } else {
    personalizedSuggestions.push({
      id: 'TIP-WASTE-2',
      domain: 'Waste & Recycling',
      priority: 'Quick Win',
      title: 'Reduce single-use packaging at source',
      description: `Your ${latest.recyclingRatePct}% recycling rate is solid—next, lowering total incoming packaging weight (refill stations, loose produce) cuts overall kg generated.`,
      estimatedBenefit: 'Reduces total monthly waste by 3–6 kg',
    });
  }

  personalizedSuggestions.push({
    id: 'TIP-HABIT-1',
    domain: 'General Habits',
    priority: 'Quick Win',
    title: 'Add short monthly notes alongside meter readings',
    description:
      'Recording events like travel, guests, or appliance upgrades helps distinguish temporary lifestyle shifts from persistent utility inefficiencies.',
    estimatedBenefit: 'Improves anomaly detection accuracy',
  });

  const summaryText =
    sortedRecords.length < 2
      ? `${profile.householdName} logged ${latest.label} (${latest.electricityKwh} kWh electricity, ${latest.waterLitres.toLocaleString()} L water, ${latest.wasteGeneratedKg} kg waste with ${latest.recyclingRatePct}% recycled). Add at least one more month to enable month-over-month and historical anomaly comparisons.`
      : anomalies.length === 0
        ? `${profile.householdName}'s ${latest.label} consumption (${latest.electricityKwh} kWh, ${latest.waterLitres.toLocaleString()} L water, ${latest.wasteGeneratedKg} kg waste) remains aligned with your prior ${count}-month baseline, with no unusual spikes or drops detected.`
        : `Across ${sortedRecords.length} months of tracking for ${profile.householdName}, TerraTrust detected ${anomalies.length} unusual consumption shift(s) in ${latest.label} compared with your prior ${count}-month baseline. These shifts highlight notable changes in utility or waste patterns and are paired below with everyday explanations and practical reduction tips.`;

  return {
    sortedProfile,
    latestMonth: latest,
    historicalAverages,
    latestVsAveragePct,
    monthlyComparisons,
    anomalies,
    personalizedSuggestions,
    summaryText,
  };
}
