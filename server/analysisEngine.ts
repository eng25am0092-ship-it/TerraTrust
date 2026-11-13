import type {
  ClaimEvaluation,
  ConsistencyCategory,
  EnvironmentalMetrics,
  EnvironmentalSubmission,
  MetricDeltaSummary,
  ScoreBreakdown,
  VerificationFinding,
  VerificationResult,
} from '../src/types/verification';

const METRIC_META: Array<{
  key: keyof EnvironmentalMetrics;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}> = [
  { key: 'carbonEmissions', label: 'Carbon Emissions', unit: 'tonnes CO2e', lowerIsBetter: true },
  { key: 'waterConsumption', label: 'Water Consumption', unit: 'KL', lowerIsBetter: true },
  { key: 'energyConsumption', label: 'Total Energy Consumption', unit: 'MWh', lowerIsBetter: true },
  { key: 'renewableEnergyPct', label: 'Renewable Energy Share', unit: '%', lowerIsBetter: false },
  { key: 'wasteGenerated', label: 'Waste Generated', unit: 'tonnes', lowerIsBetter: true },
  { key: 'wasteRecycled', label: 'Waste Recycled', unit: 'tonnes', lowerIsBetter: false },
];

function roundOne(val: number): number {
  return Math.round(val * 10) / 10;
}

function fmtNum(val: number | null, unit: string): string {
  if (val === null || Number.isNaN(val)) return 'Not provided';
  const formatted = val.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return unit === '%' ? `${formatted}%` : `${formatted} ${unit}`;
}

function extractPercentages(text: string): number[] {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  return matches.map((m) => parseFloat(m[1]));
}

export function computeMetricDeltas(submission: EnvironmentalSubmission): MetricDeltaSummary[] {
  return METRIC_META.map(({ key, label, unit, lowerIsBetter }) => {
    const prev = submission.previousMetrics[key];
    const curr = submission.currentMetrics[key];
    let absoluteChange: number | null = null;
    let percentChange: number | null = null;
    let directionNote = 'Insufficient data for year-over-year comparison';

    if (prev !== null && curr !== null) {
      absoluteChange = roundOne(curr - prev);
      if (key === 'renewableEnergyPct') {
        percentChange = absoluteChange; // percentage point shift
        if (absoluteChange > 0) directionNote = `+${absoluteChange} percentage points`;
        else if (absoluteChange < 0) directionNote = `${absoluteChange} percentage points`;
        else directionNote = 'No change';
      } else if (prev !== 0) {
        percentChange = roundOne(((curr - prev) / prev) * 100);
        const absPct = Math.abs(percentChange);
        if (percentChange > 0) {
          directionNote = lowerIsBetter
            ? `Increased by ${absPct}% (unfavorable trend)`
            : `Increased by ${absPct}%`;
        } else if (percentChange < 0) {
          directionNote = lowerIsBetter
            ? `Reduced by ${absPct}%`
            : `Decreased by ${absPct}%`;
        } else {
          directionNote = 'Unchanged year-over-year';
        }
      } else {
        directionNote = curr === 0 ? 'Remained at 0' : 'Increased from 0 baseline';
      }
    } else if (curr !== null && prev === null) {
      directionNote = 'Previous reporting year baseline missing';
    } else if (curr === null && prev !== null) {
      directionNote = 'Current reporting year figure missing';
    }

    return {
      key,
      label,
      unit,
      previousValue: prev,
      currentValue: curr,
      absoluteChange,
      percentChange,
      directionNote,
    };
  });
}

export function runDeterministicVerification(submission: EnvironmentalSubmission): {
  metricDeltas: MetricDeltaSummary[];
  claimEvaluations: ClaimEvaluation[];
  findings: VerificationFinding[];
  recommendations: string[];
  scoreBreakdown: ScoreBreakdown;
  consistencyScore: number;
  consistencyCategory: ConsistencyCategory;
  summaryMetrics: VerificationResult['summaryMetrics'];
  executiveSummary: string;
} {
  const metricDeltas = computeMetricDeltas(submission);
  const findings: VerificationFinding[] = [];
  const claimEvaluations: ClaimEvaluation[] = [];
  const recommendationsSet = new Set<string>();

  const prev = submission.previousMetrics;
  const curr = submission.currentMetrics;

  const deltaByKey = Object.fromEntries(metricDeltas.map((d) => [d.key, d])) as Record<
    keyof EnvironmentalMetrics,
    MetricDeltaSummary
  >;

  let findingCounter = 1;
  const nextId = () => `TT-F${String(findingCounter++).padStart(2, '0')}`;

  // 1. Check impossible / conflicting internal values
  if (
    curr.wasteGenerated !== null &&
    curr.wasteRecycled !== null &&
    curr.wasteRecycled > curr.wasteGenerated
  ) {
    findings.push({
      id: nextId(),
      title: 'Recycled waste exceeds total waste generated',
      claimOrDataPoint: `Current year waste metrics (${submission.reportingYear})`,
      category: 'Data Inconsistency',
      severity: 'High',
      reasonFlagged: 'Conflicting values where recycled tonnage exceeds total waste generated.',
      numericalEvidence: `Waste recycled: ${fmtNum(curr.wasteRecycled, 'tonnes')} vs. Waste generated: ${fmtNum(curr.wasteGenerated, 'tonnes')}`,
      explanation:
        'A facility cannot recycle more waste than it generates in the same period unless legacy stockpiles or external waste streams are included without disclosure. This indicates a potential reporting boundary error.',
      verificationSteps: [
        'Reconcile waste transfer manifests and verify whether legacy stockpiles were counted.',
        'Clarify reporting boundaries between generated operational waste and recycled materials.',
      ],
    });
    recommendationsSet.add('Reconcile waste generated and waste recycled accounting boundaries.');
  }

  // 2. Check missing environmental data
  const missingCurrentFields = METRIC_META.filter((m) => curr[m.key] === null).map((m) => m.label);
  const missingPrevFields = METRIC_META.filter((m) => prev[m.key] === null).map((m) => m.label);

  if (missingCurrentFields.length > 0 || missingPrevFields.length > 0) {
    const missingDetails: string[] = [];
    if (missingCurrentFields.length > 0) {
      missingDetails.push(`${submission.reportingYear}: ${missingCurrentFields.join(', ')}`);
    }
    if (missingPrevFields.length > 0) {
      missingDetails.push(`${submission.previousYear}: ${missingPrevFields.join(', ')}`);
    }
    const isEnergyMissingWithRenewable =
      (curr.energyConsumption === null || prev.energyConsumption === null) &&
      curr.renewableEnergyPct !== null;

    if (!isEnergyMissingWithRenewable) {
      findings.push({
        id: nextId(),
        title: 'Incomplete baseline or current environmental records',
        claimOrDataPoint: 'Submitted environmental metrics dataset',
        category: 'Missing Evidence',
        severity: missingCurrentFields.length + missingPrevFields.length >= 3 ? 'High' : 'Medium',
        reasonFlagged: 'Missing environmental figures prevent full year-over-year trend verification.',
        numericalEvidence: `Missing entries — ${missingDetails.join(' | ')}`,
        explanation:
          'When historical baseline or total operational metrics are omitted, year-over-year sustainability comparisons remain incomplete and require verification against primary utility or meter records.',
        verificationSteps: [
          `Submit complete baseline figures for ${missingDetails.join(' and ')}.`,
          'Attach utility bills or internal metering logs covering the full reporting period.',
        ],
      });
    }
    if (missingPrevFields.length > 0) {
      recommendationsSet.add(`Submit complete ${submission.previousYear} baseline environmental records for missing metrics.`);
    }
    if (missingCurrentFields.length > 0) {
      recommendationsSet.add(`Provide ${submission.reportingYear} operational records for: ${missingCurrentFields.join(', ')}.`);
    }
  }

  // 3. Renewable energy vs missing total energy consumption check
  if (
    curr.renewableEnergyPct !== null &&
    (curr.energyConsumption === null || prev.energyConsumption === null)
  ) {
    const renDelta = deltaByKey.renewableEnergyPct;
    const prevPctText = prev.renewableEnergyPct !== null ? `${prev.renewableEnergyPct}%` : 'not provided';
    findings.push({
      id: nextId(),
      title: 'Renewable energy share reported without supporting total energy consumption records',
      claimOrDataPoint: `Renewable energy usage (${curr.renewableEnergyPct}% in ${submission.reportingYear})`,
      category: 'Missing Evidence',
      severity: 'Medium',
      reasonFlagged:
        'Percentage renewable energy figure was supplied, but total energy consumption (MWh) records are missing.',
      numericalEvidence: `Renewable share: ${prevPctText} → ${curr.renewableEnergyPct}% (${renDelta.directionNote}); Total energy consumption: ${fmtNum(prev.energyConsumption, 'MWh')} → ${fmtNum(curr.energyConsumption, 'MWh')}`,
      explanation:
        'Reporting only a percentage shift in renewable energy without disclosing total energy consumption makes it impossible to verify whether fossil-fuel usage actually decreased or total energy demand surged.',
      verificationSteps: [
        'Provide total electricity and fuel consumption logs in MWh for both reporting years.',
        'Submit Renewable Energy Certificates (RECs) or Power Purchase Agreements (PPAs) supporting the reported share.',
      ],
    });
    recommendationsSet.add('Provide supporting total energy consumption records (MWh) and renewable energy certificates.');
  }

  // 4. Sudden unexplained metric shifts (> 25% YoY)
  if (
    deltaByKey.waterConsumption.percentChange !== null &&
    deltaByKey.waterConsumption.percentChange >= 25
  ) {
    const pct = deltaByKey.waterConsumption.percentChange;
    findings.push({
      id: nextId(),
      title: `Unusual ${pct}% surge in water consumption requires investigation`,
      claimOrDataPoint: 'Water Consumption YoY Trend',
      category: 'Trend Anomaly',
      severity: 'Medium',
      reasonFlagged: 'Substantial year-over-year increase exceeding 25% without production volume context.',
      numericalEvidence: `${fmtNum(prev.waterConsumption, 'KL')} (${submission.previousYear}) → ${fmtNum(curr.waterConsumption, 'KL')} (${submission.reportingYear}) | +${pct}%`,
      explanation:
        'Water intake rose sharply by nearly a third year-over-year. While this could reflect expanded manufacturing output or cooling demand, it conflicts with typical conservation expectations and requires operational context.',
      verificationSteps: [
        'Provide facility production volume or water-intensity metrics (KL per unit produced).',
        'Review municipal water invoices and sub-metering records for leaks or new processes.',
      ],
    });
    recommendationsSet.add('Explain the operational drivers behind the sharp year-over-year increase in water consumption.');
  }

  if (
    deltaByKey.wasteGenerated.percentChange !== null &&
    deltaByKey.wasteGenerated.percentChange >= 25
  ) {
    const prevRate =
      prev.wasteGenerated && prev.wasteRecycled !== null
        ? roundOne((prev.wasteRecycled / prev.wasteGenerated) * 100)
        : null;
    const currRate =
      curr.wasteGenerated && curr.wasteRecycled !== null
        ? roundOne((curr.wasteRecycled / curr.wasteGenerated) * 100)
        : null;

    if (prevRate !== null && currRate !== null && currRate < prevRate) {
      findings.push({
        id: nextId(),
        title: 'Total waste generation surged while overall recycling rate declined',
        claimOrDataPoint: 'Waste Generated vs. Waste Recycled Trend',
        category: 'Trend Anomaly',
        severity: 'Medium',
        reasonFlagged:
          'Recycled tonnage increased, yet total waste generated grew faster, lowering the net recycling rate.',
        numericalEvidence: `Waste generated: ${fmtNum(prev.wasteGenerated, 'tonnes')} → ${fmtNum(curr.wasteGenerated, 'tonnes')} (+${deltaByKey.wasteGenerated.percentChange}%) | Recycled: ${fmtNum(prev.wasteRecycled, 'tonnes')} → ${fmtNum(curr.wasteRecycled, 'tonnes')} | Recycling rate: ${prevRate}% → ${currRate}%`,
        explanation:
          'Highlighting higher recycled tonnage alone creates a selective picture when total waste generation increased even faster. In percentage terms, the share of waste diverted from landfill actually decreased.',
        verificationSteps: [
          'Disclose both total waste generated and percentage recycling rate side by side.',
          'Submit waste hauler receipts and material recovery facility weight tickets.',
        ],
      });
      recommendationsSet.add('Report net recycling rate (%) alongside absolute waste tonnage and explain waste growth.');
    }
  }

  // 5. Evaluate every sustainability claim against deterministic evidence
  for (const rawClaim of submission.claims) {
    const claim = rawClaim.trim();
    if (!claim) continue;
    const lower = claim.toLowerCase();
    const nums = extractPercentages(claim);

    // A) Carbon / emissions claim
    if (
      lower.includes('carbon') ||
      lower.includes('emission') ||
      lower.includes('co2') ||
      lower.includes('ghg') ||
      lower.includes('decarbon') ||
      lower.includes('net zero') ||
      lower.includes('net-zero')
    ) {
      const cDelta = deltaByKey.carbonEmissions;
      if (cDelta.previousValue === null || cDelta.currentValue === null || cDelta.percentChange === null) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Carbon Emissions',
          status: 'Requires verification',
          claimedSummary: nums.length ? `${nums[0]}% emissions target` : 'Emissions reduction claim',
          actualEvidence: `Prev: ${fmtNum(prev.carbonEmissions, 'tCO2e')} | Curr: ${fmtNum(curr.carbonEmissions, 'tCO2e')}`,
          varianceNote: 'Incomplete carbon baseline or current data',
        });
        findings.push({
          id: nextId(),
          title: 'Carbon reduction claim lacks complete emissions dataset',
          claimOrDataPoint: claim,
          category: 'Missing Evidence',
          severity: 'High',
          reasonFlagged: 'Claimed carbon progress cannot be corroborated without both baseline and current figures.',
          numericalEvidence: `Previous: ${fmtNum(prev.carbonEmissions, 'tonnes CO2e')} | Current: ${fmtNum(curr.carbonEmissions, 'tonnes CO2e')}`,
          explanation:
            'The company makes a specific carbon emissions claim, but one or both reporting-period figures are missing from the submitted dataset.',
          verificationSteps: [
            'Provide verified Scope 1 and Scope 2 GHG inventory calculations for both years.',
            'Clarify emission factors and organizational boundaries used.',
          ],
        });
        recommendationsSet.add('Verify carbon emission calculations with full Scope 1 & 2 activity data.');
      } else {
        const actualReductionPct = roundOne(-cDelta.percentChange); // positive means reduction
        const claimedReductionPct = nums.length > 0 ? nums[0] : null;

        if (lower.includes('net zero') || lower.includes('net-zero') || lower.includes('carbon neutral')) {
          if (cDelta.currentValue > 0) {
            claimEvaluations.push({
              claim,
              metricDomain: 'Carbon Emissions',
              status: 'Potential inconsistency',
              claimedSummary: 'Net-zero / carbon neutral assertion',
              actualEvidence: `${fmtNum(curr.carbonEmissions, 'tonnes CO2e')} reported (${actualReductionPct >= 0 ? `${actualReductionPct}% YoY reduction` : `+${Math.abs(actualReductionPct)}% YoY increase`})`,
              varianceNote: 'Significant positive emissions remain without offset audit',
            });
            findings.push({
              id: nextId(),
              title: 'Net-zero or carbon-neutral claim requires offset and boundary verification',
              claimOrDataPoint: claim,
              category: 'Potential Greenwashing',
              severity: 'High',
              reasonFlagged: 'Absolute net-zero claim asserted despite substantial reported gross carbon emissions.',
              numericalEvidence: `Reported emissions: ${fmtNum(curr.carbonEmissions, 'tonnes CO2e')} in ${submission.reportingYear}`,
              explanation:
                'Claiming net-zero or carbon neutrality while reporting substantial positive emissions requires transparent disclosure of retired carbon credits and Scope 1–3 coverage.',
              verificationSteps: [
                'Provide serialized carbon offset retirement certificates from a recognized registry.',
                'Disclose gross emissions separately from any claimed offsets.',
              ],
            });
          }
        } else if (actualReductionPct <= 0 && (lower.includes('reduc') || lower.includes('decreas') || lower.includes('cut') || lower.includes('lower') || lower.includes('drop'))) {
          const risePct = Math.abs(actualReductionPct);
          claimEvaluations.push({
            claim,
            metricDomain: 'Carbon Emissions',
            status: 'Suspicious pattern',
            claimedSummary: claimedReductionPct !== null ? `${claimedReductionPct}% reduction claimed` : 'Emissions reduction claimed',
            actualEvidence: `${fmtNum(prev.carbonEmissions, 't')} → ${fmtNum(curr.carbonEmissions, 't')} (+${risePct}% increase)`,
            varianceNote: `Direction contradiction: emissions rose ${risePct}%`,
          });
          findings.push({
            id: nextId(),
            title: 'Carbon reduction claim contradicts rising reported emissions',
            claimOrDataPoint: claim,
            category: 'Potential Greenwashing',
            severity: 'High',
            reasonFlagged: 'Claim states emissions decreased, while supplied data shows an increase.',
            numericalEvidence: `Previous: ${fmtNum(prev.carbonEmissions, 'tonnes')} → Current: ${fmtNum(curr.carbonEmissions, 'tonnes')} (+${risePct}% YoY)`,
            explanation:
              'The sustainability statement asserts a reduction in carbon emissions, yet the company’s submitted inventory shows emissions increased over the same period. This discrepancy requires immediate clarification.',
            verificationSteps: [
              'Verify whether the claim refers to emission intensity (per unit) rather than absolute emissions.',
              'Audit Scope 1, 2, and 3 calculation spreadsheets for consistency.',
            ],
          });
          recommendationsSet.add('Verify carbon emission calculations and reconcile absolute vs. intensity metrics.');
        } else if (claimedReductionPct !== null) {
          const diff = roundOne(Math.abs(claimedReductionPct - actualReductionPct));
          if (diff > 5) {
            claimEvaluations.push({
              claim,
              metricDomain: 'Carbon Emissions',
              status: 'Potential inconsistency',
              claimedSummary: `${claimedReductionPct}% reduction claimed`,
              actualEvidence: `${actualReductionPct}% actual reduction (${fmtNum(prev.carbonEmissions, 't')} → ${fmtNum(curr.carbonEmissions, 't')})`,
              varianceNote: `${diff} percentage point gap`,
            });
            findings.push({
              id: nextId(),
              title: `Carbon reduction claim (${claimedReductionPct}%) diverges from submitted data (${actualReductionPct}%)`,
              claimOrDataPoint: claim,
              category: 'Potential Greenwashing',
              severity: diff >= 15 ? 'High' : 'Medium',
              reasonFlagged: `Claimed reduction exceeds calculated year-over-year reduction by ${diff} percentage points.`,
              numericalEvidence: `Claimed: -${claimedReductionPct}% | Submitted data: ${fmtNum(prev.carbonEmissions, 'tonnes')} → ${fmtNum(curr.carbonEmissions, 'tonnes')} (-${actualReductionPct}%)`,
              explanation: `The company claims a ${claimedReductionPct}% reduction in carbon emissions, whereas the submitted figures indicate only a ${actualReductionPct}% reduction. Unless a multi-year baseline (earlier than ${submission.previousYear}) was used without disclosure, the claim appears overstated.`,
              verificationSteps: [
                'Verify carbon emission calculations and disclose the exact baseline year referenced.',
                'Provide third-party GHG verification statements covering Scope 1 and Scope 2 totals.',
              ],
            });
            recommendationsSet.add('Verify carbon emission calculations and clarify baseline periods for all percentage claims.');
          } else {
            claimEvaluations.push({
              claim,
              metricDomain: 'Carbon Emissions',
              status: 'Verified against supplied data',
              claimedSummary: `${claimedReductionPct}% reduction claimed`,
              actualEvidence: `${actualReductionPct}% actual reduction (${fmtNum(prev.carbonEmissions, 't')} → ${fmtNum(curr.carbonEmissions, 't')})`,
              varianceNote: `Aligned within ${diff}pp tolerance`,
            });
          }
        } else {
          // General reduction claim without specific %
          if (actualReductionPct > 0) {
            claimEvaluations.push({
              claim,
              metricDomain: 'Carbon Emissions',
              status: 'Verified against supplied data',
              claimedSummary: 'Qualitative emissions reduction claim',
              actualEvidence: `${actualReductionPct}% reduction (${fmtNum(prev.carbonEmissions, 't')} → ${fmtNum(curr.carbonEmissions, 't')})`,
              varianceNote: 'Supported by directional decrease',
            });
          } else {
            claimEvaluations.push({
              claim,
              metricDomain: 'Carbon Emissions',
              status: 'Requires verification',
              claimedSummary: 'Qualitative carbon claim',
              actualEvidence: `${fmtNum(prev.carbonEmissions, 't')} → ${fmtNum(curr.carbonEmissions, 't')}`,
              varianceNote: 'No quantitative reduction observed',
            });
          }
        }
      }
      continue;
    }

    // B) Water claim
    if (lower.includes('water')) {
      const wDelta = deltaByKey.waterConsumption;
      if (wDelta.previousValue === null || wDelta.currentValue === null || wDelta.percentChange === null) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Water Consumption',
          status: 'Requires verification',
          claimedSummary: nums.length ? `${nums[0]}% water improvement` : 'Water conservation claim',
          actualEvidence: `Prev: ${fmtNum(prev.waterConsumption, 'KL')} | Curr: ${fmtNum(curr.waterConsumption, 'KL')}`,
          varianceNote: 'Incomplete water consumption records',
        });
        findings.push({
          id: nextId(),
          title: 'Water conservation claim lacks complete consumption records',
          claimOrDataPoint: claim,
          category: 'Missing Evidence',
          severity: 'Medium',
          reasonFlagged: 'Water figures are missing for one or more reporting periods.',
          numericalEvidence: `Previous: ${fmtNum(prev.waterConsumption, 'KL')} | Current: ${fmtNum(curr.waterConsumption, 'KL')}`,
          explanation: 'Water conservation statements cannot be confirmed without metered intake data for both comparison years.',
          verificationSteps: [
            'Submit facility water meter logs and municipal utility invoices for both periods.',
          ],
        });
      } else if (
        wDelta.percentChange > 0 &&
        (lower.includes('conserv') ||
          lower.includes('reduc') ||
          lower.includes('improv') ||
          lower.includes('sav') ||
          lower.includes('declin') ||
          lower.includes('lower'))
      ) {
        const increasePct = wDelta.percentChange;
        claimEvaluations.push({
          claim,
          metricDomain: 'Water Consumption',
          status: 'Suspicious pattern',
          claimedSummary: nums.length ? `${nums[0]}% conservation improvement` : 'Water conservation improved',
          actualEvidence: `${fmtNum(prev.waterConsumption, 'KL')} → ${fmtNum(curr.waterConsumption, 'KL')} (+${increasePct}% increase)`,
          varianceNote: `Contradicts data: water usage rose ${increasePct}%`,
        });
        findings.push({
          id: nextId(),
          title: `Water conservation claim contradicts ${increasePct}% increase in water consumption`,
          claimOrDataPoint: claim,
          category: 'Potential Greenwashing',
          severity: 'High',
          reasonFlagged: 'Claim asserts improved water conservation while total water usage rose substantially.',
          numericalEvidence: `Claimed: ${nums.length ? `${nums[0]}% improvement` : 'Conservation improvement'} | Actual usage: ${fmtNum(prev.waterConsumption, 'KL')} → ${fmtNum(curr.waterConsumption, 'KL')} (+${increasePct}%)`,
          explanation: `Despite claiming water conservation improvements, submitted records show total water consumption increased by ${increasePct}% (an extra ${(curr.waterConsumption! - prev.waterConsumption!).toLocaleString('en-US')} KL). This represents a direct contradiction requiring verification.`,
          verificationSteps: [
            'Provide water withdrawal and closed-loop recycling logs explaining the +30% volume rise.',
            'Clarify whether conservation claims apply only to a single site rather than company-wide operations.',
          ],
        });
        recommendationsSet.add('Investigate and explain the discrepancy between water conservation claims and higher water usage.');
      } else {
        const actualWaterReduction = roundOne(-wDelta.percentChange);
        const claimedPct = nums.length ? nums[0] : null;
        if (claimedPct !== null && Math.abs(claimedPct - actualWaterReduction) > 5) {
          claimEvaluations.push({
            claim,
            metricDomain: 'Water Consumption',
            status: 'Potential inconsistency',
            claimedSummary: `${claimedPct}% reduction claimed`,
            actualEvidence: `${actualWaterReduction}% actual reduction`,
            varianceNote: `${roundOne(Math.abs(claimedPct - actualWaterReduction))}pp gap`,
          });
          findings.push({
            id: nextId(),
            title: 'Water reduction claim magnitude differs from submitted records',
            claimOrDataPoint: claim,
            category: 'Data Inconsistency',
            severity: 'Medium',
            reasonFlagged: 'Claimed percentage reduction differs from calculated YoY water change.',
            numericalEvidence: `Claimed: ${claimedPct}% | Actual: ${actualWaterReduction}% (${fmtNum(prev.waterConsumption, 'KL')} → ${fmtNum(curr.waterConsumption, 'KL')})`,
            explanation: 'The stated water savings percentage does not closely align with the submitted annual intake figures.',
            verificationSteps: ['Verify water sub-metering scope and reconcile site-level totals.'],
          });
        } else {
          claimEvaluations.push({
            claim,
            metricDomain: 'Water Consumption',
            status: 'Verified against supplied data',
            claimedSummary: claimedPct !== null ? `${claimedPct}% reduction claimed` : 'Water usage reduction',
            actualEvidence: `${actualWaterReduction}% actual reduction (${fmtNum(prev.waterConsumption, 'KL')} → ${fmtNum(curr.waterConsumption, 'KL')})`,
            varianceNote: 'Consistent with submitted data',
          });
        }
      }
      continue;
    }

    // C) Renewable energy claim
    if (lower.includes('renewable') || lower.includes('solar') || lower.includes('wind') || lower.includes('clean energy') || lower.includes('green power')) {
      const targetPct = nums.length > 0 ? nums[0] : null;
      const actualPct = curr.renewableEnergyPct;
      const missingEnergy = curr.energyConsumption === null || prev.energyConsumption === null;

      if (actualPct === null) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Renewable Energy',
          status: 'Requires verification',
          claimedSummary: targetPct !== null ? `${targetPct}% renewable share claimed` : 'Renewable energy transition claim',
          actualEvidence: 'Renewable energy % not provided',
          varianceNote: 'Supporting metric missing',
        });
        findings.push({
          id: nextId(),
          title: 'Renewable energy claim lacks quantitative renewable share data',
          claimOrDataPoint: claim,
          category: 'Missing Evidence',
          severity: 'High',
          reasonFlagged: 'Claim asserts renewable power transition without supplying renewable percentage or MWh figures.',
          numericalEvidence: `Renewable share: Not provided | Energy MWh: ${fmtNum(curr.energyConsumption, 'MWh')}`,
          explanation: 'Qualitative claims about predominantly renewable power require quantitative energy mix breakdowns to avoid misleading impressions.',
          verificationSteps: [
            'Disclose exact percentage of electricity and thermal energy sourced from renewables.',
            'Submit utility green-tariff invoices or retired Energy Attribute Certificates.',
          ],
        });
        recommendationsSet.add('Provide supporting energy consumption records and renewable mix documentation.');
      } else if (targetPct !== null && Math.abs(targetPct - actualPct) > 4) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Renewable Energy',
          status: 'Potential inconsistency',
          claimedSummary: `${targetPct}% renewable claimed`,
          actualEvidence: `${actualPct}% reported`,
          varianceNote: `${roundOne(Math.abs(targetPct - actualPct))}pp discrepancy`,
        });
        findings.push({
          id: nextId(),
          title: `Renewable energy claim (${targetPct}%) does not match reported ${actualPct}% share`,
          claimOrDataPoint: claim,
          category: 'Data Inconsistency',
          severity: 'High',
          reasonFlagged: 'Claimed renewable energy share diverges from the reported metric.',
          numericalEvidence: `Claimed: ${targetPct}% | Reported: ${actualPct}%`,
          explanation: 'The stated renewable energy percentage differs from the numerical field submitted for the same reporting period.',
          verificationSteps: ['Reconcile electricity-only renewable share vs. total energy (electricity + thermal) share.'],
        });
      } else if (missingEnergy) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Renewable Energy',
          status: 'Requires verification',
          claimedSummary: targetPct !== null ? `Increased to ${targetPct}%` : `Reported ${actualPct}%`,
          actualEvidence: `${prev.renewableEnergyPct ?? 'N/A'}% → ${actualPct}%, total MWh missing`,
          varianceNote: 'Percentage matches, but total energy records missing',
        });
      } else if (
        lower.includes('predominantly') ||
        lower.includes('mostly') ||
        lower.includes('primarily')
      ) {
        if (actualPct < 50) {
          claimEvaluations.push({
            claim,
            metricDomain: 'Renewable Energy',
            status: 'Suspicious pattern',
            claimedSummary: 'Predominantly renewable power claimed',
            actualEvidence: `${actualPct}% renewable energy share reported`,
            varianceNote: 'Below 50% majority threshold',
          });
          findings.push({
            id: nextId(),
            title: 'Claim of "predominantly" renewable power unsupported by 12% reported share',
            claimOrDataPoint: claim,
            category: 'Potential Greenwashing',
            severity: 'High',
            reasonFlagged: `Claim implies majority renewable usage while reported renewable share is ${actualPct}%.`,
            numericalEvidence: `Reported renewable share: ${actualPct}% (under 50% threshold) | Total energy: ${fmtNum(curr.energyConsumption, 'MWh')}`,
            explanation: `Describing operations as predominantly powered by renewables when the reported share is ${actualPct}% creates a misleading impression of the company's actual energy mix.`,
            verificationSteps: [
              'Revise qualitative wording to reflect the actual renewable share accurately.',
              'Provide facility-level energy mix disclosures.',
            ],
          });
        } else {
          claimEvaluations.push({
            claim,
            metricDomain: 'Renewable Energy',
            status: 'Verified against supplied data',
            claimedSummary: 'Predominantly renewable energy',
            actualEvidence: `${actualPct}% renewable share (${fmtNum(curr.energyConsumption, 'MWh')} total)`,
            varianceNote: 'Supported by >50% share and MWh records',
          });
        }
      } else {
        claimEvaluations.push({
          claim,
          metricDomain: 'Renewable Energy',
          status: 'Verified against supplied data',
          claimedSummary: targetPct !== null ? `Reached ${targetPct}%` : 'Renewable energy increase',
          actualEvidence: `${prev.renewableEnergyPct ?? 'N/A'}% → ${actualPct}% (${fmtNum(curr.energyConsumption, 'MWh')} total)`,
          varianceNote: 'Aligned with supplied energy records',
        });
      }
      continue;
    }

    // D) Waste / recycling claim
    if (lower.includes('waste') || lower.includes('recycl') || lower.includes('landfill') || lower.includes('circular')) {
      const prevRate =
        prev.wasteGenerated && prev.wasteRecycled !== null
          ? roundOne((prev.wasteRecycled / prev.wasteGenerated) * 100)
          : null;
      const currRate =
        curr.wasteGenerated && curr.wasteRecycled !== null
          ? roundOne((curr.wasteRecycled / curr.wasteGenerated) * 100)
          : null;

      if (curr.wasteGenerated === null || curr.wasteRecycled === null) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Waste & Recycling',
          status: 'Requires verification',
          claimedSummary: 'Waste / recycling achievement claimed',
          actualEvidence: `Generated: ${fmtNum(curr.wasteGenerated, 't')} | Recycled: ${fmtNum(curr.wasteRecycled, 't')}`,
          varianceNote: 'Missing waste figures',
        });
      } else if (lower.includes('zero waste') || lower.includes('zero-waste')) {
        if (currRate !== null && currRate < 90) {
          claimEvaluations.push({
            claim,
            metricDomain: 'Waste & Recycling',
            status: 'Suspicious pattern',
            claimedSummary: 'Zero-waste milestone claimed',
            actualEvidence: `${currRate}% recycled (${fmtNum(curr.wasteRecycled, 't')} of ${fmtNum(curr.wasteGenerated, 't')})`,
            varianceNote: `${roundOne(curr.wasteGenerated - curr.wasteRecycled)} tonnes unrecycled`,
          });
          findings.push({
            id: nextId(),
            title: 'Zero-waste claim conflicts with actual recycling rate',
            claimOrDataPoint: claim,
            category: 'Potential Greenwashing',
            severity: 'High',
            reasonFlagged: `Zero-waste claim made while only ${currRate}% of generated waste was recycled.`,
            numericalEvidence: `Waste generated: ${fmtNum(curr.wasteGenerated, 'tonnes')} | Waste recycled: ${fmtNum(curr.wasteRecycled, 'tonnes')} (${currRate}% rate)`,
            explanation: `A zero-waste milestone typically requires >=90% diversion from landfill/incineration. With ${currRate}% recycled, substantial unrecycled waste remains.`,
            verificationSteps: [
              'Provide TRUE or UL Zero Waste certification if claiming a specific facility milestone.',
              'Clarify landfill vs. waste-to-energy disposition for remaining waste.',
            ],
          });
        }
      } else if (prevRate !== null && currRate !== null && currRate < prevRate) {
        claimEvaluations.push({
          claim,
          metricDomain: 'Waste & Recycling',
          status: 'Potential inconsistency',
          claimedSummary: 'Significant recycling improvement claimed',
          actualEvidence: `Recycled: ${prev.wasteRecycled}t → ${curr.wasteRecycled}t (+25%), but total waste: ${prev.wasteGenerated}t → ${curr.wasteGenerated}t`,
          varianceNote: `Net recycling rate dropped ${prevRate}% → ${currRate}%`,
        });
        findings.push({
          id: nextId(),
          title: 'Recycling improvement claim omits drop in net recycling rate',
          claimOrDataPoint: claim,
          category: 'Potential Greenwashing',
          severity: 'Medium',
          reasonFlagged:
            'Selective reporting pattern: recycled volume rose while overall recycling efficiency fell.',
          numericalEvidence: `Recycled volume: ${fmtNum(prev.wasteRecycled, 'tonnes')} → ${fmtNum(curr.wasteRecycled, 'tonnes')} | Total waste: ${fmtNum(prev.wasteGenerated, 'tonnes')} → ${fmtNum(curr.wasteGenerated, 'tonnes')} | Net rate: ${prevRate}% → ${currRate}%`,
          explanation: `While recycled tonnage increased from ${prev.wasteRecycled} to ${curr.wasteRecycled} tonnes, total waste generation grew substantially faster, causing the proportion of waste recycled to drop from ${prevRate}% to ${currRate}%. Claiming significant improvement without noting total waste growth is a selective reporting pattern that requires verification.`,
          verificationSteps: [
            'Provide full waste stream breakdowns (recycled, composted, incinerated, landfilled).',
            'Explain why total waste generation increased and report net diversion rate.',
          ],
        });
        recommendationsSet.add('Disclose net waste diversion rate (%) and total waste growth alongside recycled tonnage.');
      } else {
        claimEvaluations.push({
          claim,
          metricDomain: 'Waste & Recycling',
          status: 'Verified against supplied data',
          claimedSummary: 'Recycling performance improved',
          actualEvidence: `Rate: ${prevRate ?? 'N/A'}% → ${currRate}% (${fmtNum(curr.wasteRecycled, 't')} / ${fmtNum(curr.wasteGenerated, 't')})`,
          varianceNote: 'Supported by higher recycling rate and/or lower total waste',
        });
      }
      continue;
    }

    // E) Generic / unsubstantiated sustainability claim
    claimEvaluations.push({
      claim,
      metricDomain: 'General Sustainability',
      status: 'Requires verification',
      claimedSummary: 'General or qualitative sustainability claim',
      actualEvidence: 'No directly matching quantitative metric in dataset',
      varianceNote: 'Requires measurable supporting KPIs',
    });
    findings.push({
      id: nextId(),
      title: 'General sustainability statement lacks direct measurable evidence',
      claimOrDataPoint: claim,
      category: 'Missing Evidence',
      severity: 'Low',
      reasonFlagged: 'Broad claim cannot be mapped automatically to the supplied quantitative metrics.',
      numericalEvidence: 'No corresponding quantitative metric identified in submission.',
      explanation:
        'Vague or broad sustainability statements without clear boundaries, targets, or measurable indicators require supporting documentation to ensure transparency.',
      verificationSteps: [
        'Attach specific quantitative KPIs and third-party audit references backing this statement.',
      ],
    });
  }

  // Standard verification best-practice recommendations
  if (findings.some((f) => f.severity === 'High')) {
    recommendationsSet.add('Provide independent third-party environmental audit documentation (e.g., ISO 14064 or ISAE 3000 assurance).');
  }
  if (recommendationsSet.size === 0) {
    recommendationsSet.add('Maintain annual third-party verification and complete utility metering logs to preserve reporting transparency.');
    recommendationsSet.add('Publish Scope 3 supply chain emissions alongside Scope 1 & 2 figures in upcoming reports.');
  }

  // Calculate 4-pillar score breakdown (0–25 each, total 0–100)
  // 1. Evidence Completeness (0-25)
  const totalMetricSlots = 12;
  const filledCurrent = METRIC_META.filter((m) => curr[m.key] !== null).length;
  const filledPrev = METRIC_META.filter((m) => prev[m.key] !== null).length;
  const evidenceCompleteness = Math.round(((filledCurrent + filledPrev) / totalMetricSlots) * 25);

  // 2. Data Consistency (0-25)
  let dataConsistency = 25;
  for (const f of findings) {
    if (f.category === 'Data Inconsistency') {
      dataConsistency -= f.severity === 'High' ? 10 : 5;
    } else if (f.category === 'Missing Evidence') {
      dataConsistency -= f.severity === 'High' ? 5 : 3;
    }
  }
  dataConsistency = Math.max(0, Math.min(25, dataConsistency));

  // 3. Trend Reliability (0-25)
  let trendReliability = 25;
  for (const f of findings) {
    if (f.category === 'Trend Anomaly') {
      trendReliability -= f.severity === 'High' ? 9 : 6;
    }
  }
  if (deltaByKey.carbonEmissions.percentChange !== null && deltaByKey.carbonEmissions.percentChange > 5) {
    trendReliability -= 5;
  }
  if (deltaByKey.waterConsumption.percentChange !== null && deltaByKey.waterConsumption.percentChange > 15) {
    trendReliability -= 4;
  }
  trendReliability = Math.max(0, Math.min(25, trendReliability));

  // 4. Claim-to-Data Alignment (0-25)
  let claimToDataAlignment = 25;
  const totalClaims = claimEvaluations.length;
  if (totalClaims === 0) {
    claimToDataAlignment = 12;
  } else {
    for (const ce of claimEvaluations) {
      if (ce.status === 'Suspicious pattern') claimToDataAlignment -= 9;
      else if (ce.status === 'Potential inconsistency') claimToDataAlignment -= 7;
      else if (ce.status === 'Requires verification') claimToDataAlignment -= 4;
    }
    claimToDataAlignment = Math.max(0, Math.min(25, claimToDataAlignment));
  }

  const scoreBreakdown: ScoreBreakdown = {
    dataConsistency,
    evidenceCompleteness,
    trendReliability,
    claimToDataAlignment,
  };

  const consistencyScore = Math.max(
    0,
    Math.min(
      100,
      dataConsistency + evidenceCompleteness + trendReliability + claimToDataAlignment
    )
  );

  let consistencyCategory: ConsistencyCategory = 'Significant inconsistencies detected';
  if (consistencyScore >= 80) consistencyCategory = 'High consistency';
  else if (consistencyScore >= 60) consistencyCategory = 'Moderate consistency';
  else if (consistencyScore >= 40) consistencyCategory = 'Low consistency';

  const verifiedCount = claimEvaluations.filter(
    (c) => c.status === 'Verified against supplied data'
  ).length;
  const suspiciousCount = claimEvaluations.filter(
    (c) => c.status === 'Suspicious pattern' || c.status === 'Potential inconsistency'
  ).length;
  const requiresVerificationCount = claimEvaluations.filter(
    (c) => c.status !== 'Verified against supplied data'
  ).length;
  const highSeverityCount = findings.filter((f) => f.severity === 'High').length;

  const executiveSummary =
    consistencyScore >= 80
      ? `TerraTrust verified ${submission.companyName}'s ${submission.reportingYear} environmental submission against ${submission.previousYear} baselines. ${verifiedCount} of ${totalClaims} sustainability claims align with supplied quantitative metrics with ${findings.length} minor observation(s).`
      : `TerraTrust analyzed ${submission.companyName}'s ${submission.reportingYear} environmental data and ${totalClaims} sustainability claim(s). The analysis identified ${findings.length} finding(s) (${highSeverityCount} high-severity) involving claim-to-data discrepancies, unusual operational trends, or missing supporting evidence. These indicators signal potential inconsistencies requiring further verification rather than proven manipulation.`;

  return {
    metricDeltas,
    claimEvaluations,
    findings,
    recommendations: Array.from(recommendationsSet),
    scoreBreakdown,
    consistencyScore,
    consistencyCategory,
    summaryMetrics: {
      totalClaimsAnalysed: totalClaims,
      verifiedAgainstData: verifiedCount,
      claimsRequiringVerification: requiresVerificationCount,
      suspiciousClaims: suspiciousCount,
      detectedAnomalies: findings.length,
      highSeverityWarnings: highSeverityCount,
    },
    executiveSummary,
  };
}
