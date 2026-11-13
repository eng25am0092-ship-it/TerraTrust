import type { EnvironmentalMetrics, EnvironmentalSubmission } from '../types/verification';

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function toNullableNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[%,$\s]/g, '').replace(/,/g, '');
  if (
    cleaned === '' ||
    cleaned.toLowerCase() === 'null' ||
    cleaned.toLowerCase() === 'n/a' ||
    cleaned.toLowerCase() === 'na' ||
    cleaned === '-'
  ) {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function emptyMetrics(): EnvironmentalMetrics {
  return {
    carbonEmissions: null,
    waterConsumption: null,
    energyConsumption: null,
    renewableEnergyPct: null,
    wasteGenerated: null,
    wasteRecycled: null,
  };
}

function matchMetricKey(rawName: string): keyof EnvironmentalMetrics | null {
  const n = rawName.toLowerCase().trim();
  if (n.includes('carbon') || n.includes('co2') || n.includes('ghg') || n.includes('emission')) {
    return 'carbonEmissions';
  }
  if (n.includes('water')) return 'waterConsumption';
  if (n.includes('renewable')) return 'renewableEnergyPct';
  if (n.includes('energy')) return 'energyConsumption';
  if (n.includes('recycl')) return 'wasteRecycled';
  if (n.includes('waste')) return 'wasteGenerated';
  return null;
}

export function parseEnvironmentalCsv(
  csvText: string,
  fileName: string
): { submission?: Partial<EnvironmentalSubmission>; error?: string } {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      error: 'CSV file appears empty or missing data rows. Please include a header row and values.',
    };
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim());

  // Format A: Vertical / audit-sheet CSV (section/type, key/metric, previous_year, current_year)
  // Supports simple columns like: type,metric_or_claim,previous_year,current_year
  // OR metric,previous_year,current_year
  const metricColIdx = headers.findIndex((h) => h === 'metric' || h === 'field' || h === 'metric_or_claim' || h === 'parameter');
  const prevColIdx = headers.findIndex((h) => h.includes('prev') || h === 'baseline' || h === '2024');
  const currColIdx = headers.findIndex((h) => h.includes('curr') || h === 'reported' || h === '2025');

  if (metricColIdx !== -1 && (prevColIdx !== -1 || currColIdx !== -1)) {
    const previousMetrics = emptyMetrics();
    const currentMetrics = emptyMetrics();
    const claims: string[] = [];
    let companyName = fileName.replace(/\.csv$/i, '').replace(/[_-]+/g, ' ');
    let industry: string | undefined;
    let reportingYear = 2025;
    let previousYear = 2024;

    const typeColIdx = headers.findIndex((h) => h === 'type' || h === 'category' || h === 'section');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowType = typeColIdx !== -1 ? (row[typeColIdx] || '').toLowerCase() : '';
      const label = row[metricColIdx] || '';
      const prevVal = prevColIdx !== -1 ? row[prevColIdx] : '';
      const currVal = currColIdx !== -1 ? row[currColIdx] : '';

      if (!label) continue;
      const lowerLabel = label.toLowerCase();

      if (rowType === 'claim' || lowerLabel === 'claim' || lowerLabel.startsWith('claim:')) {
        const claimText =
          lowerLabel === 'claim' ? currVal || prevVal : label.replace(/^claim:\s*/i, '');
        if (claimText.trim()) claims.push(claimText.trim());
        continue;
      }

      if (lowerLabel === 'company' || lowerLabel === 'company name' || lowerLabel === 'company_name') {
        if (currVal || prevVal) companyName = (currVal || prevVal).trim();
        continue;
      }
      if (lowerLabel === 'industry') {
        if (currVal || prevVal) industry = (currVal || prevVal).trim();
        continue;
      }
      if (lowerLabel === 'reporting year' || lowerLabel === 'reporting_year') {
        const yr = parseInt(currVal || prevVal, 10);
        if (!Number.isNaN(yr)) reportingYear = yr;
        continue;
      }
      if (lowerLabel === 'previous year' || lowerLabel === 'previous_year') {
        const yr = parseInt(prevVal || currVal, 10);
        if (!Number.isNaN(yr)) previousYear = yr;
        continue;
      }

      const key = matchMetricKey(label);
      if (key) {
        previousMetrics[key] = toNullableNumber(prevVal);
        currentMetrics[key] = toNullableNumber(currVal);
      }
    }

    return {
      submission: {
        companyName,
        industry,
        reportingYear,
        previousYear,
        previousMetrics,
        currentMetrics,
        claims,
        sourceType: 'csv',
        sourceFileName: fileName,
      },
    };
  }

  // Format B: Flat horizontal CSV (one company row with columns)
  const dataRow = rows[1];
  const getCol = (...aliases: string[]) => {
    const idx = headers.findIndex((h) => aliases.some((a) => h.includes(a)));
    return idx !== -1 ? dataRow[idx] : undefined;
  };

  const companyName =
    getCol('company_name', 'company') || fileName.replace(/\.csv$/i, '').replace(/[_-]+/g, ' ');
  const reportingYear = parseInt(getCol('reporting_year', 'year') || '2025', 10) || 2025;
  const previousYear = parseInt(getCol('previous_year') || String(reportingYear - 1), 10) || reportingYear - 1;

  const currentMetrics: EnvironmentalMetrics = {
    carbonEmissions: toNullableNumber(getCol('carbon_curr', 'current_carbon', 'carbon_emissions')),
    waterConsumption: toNullableNumber(getCol('water_curr', 'current_water', 'water_consumption')),
    energyConsumption: toNullableNumber(getCol('energy_curr', 'current_energy', 'energy_consumption')),
    renewableEnergyPct: toNullableNumber(getCol('renewable_curr', 'current_renewable', 'renewable_energy')),
    wasteGenerated: toNullableNumber(getCol('waste_gen_curr', 'current_waste_generated', 'waste_generated')),
    wasteRecycled: toNullableNumber(getCol('waste_rec_curr', 'current_waste_recycled', 'waste_recycled')),
  };

  const previousMetrics: EnvironmentalMetrics = {
    carbonEmissions: toNullableNumber(getCol('carbon_prev', 'previous_carbon')),
    waterConsumption: toNullableNumber(getCol('water_prev', 'previous_water')),
    energyConsumption: toNullableNumber(getCol('energy_prev', 'previous_energy')),
    renewableEnergyPct: toNullableNumber(getCol('renewable_prev', 'previous_renewable')),
    wasteGenerated: toNullableNumber(getCol('waste_gen_prev', 'previous_waste_generated')),
    wasteRecycled: toNullableNumber(getCol('waste_rec_prev', 'previous_waste_recycled')),
  };

  const claimsRaw = getCol('claims', 'sustainability_claims') || '';
  const claims = claimsRaw
    .split(/[;|]/)
    .map((c) => c.trim())
    .filter(Boolean);

  const hasAny = Object.values(currentMetrics).some((v) => v !== null);
  if (!hasAny) {
    return {
      error:
        'Could not recognize environmental metric columns in this CSV. Download the sample CSV template to see the expected column structure.',
    };
  }

  return {
    submission: {
      companyName,
      reportingYear,
      previousYear,
      currentMetrics,
      previousMetrics,
      claims,
      sourceType: 'csv',
      sourceFileName: fileName,
    },
  };
}

export function generateSampleCsvContent(): string {
  return [
    'type,metric_or_claim,previous_year,current_year',
    'meta,company_name,GreenFuture Industries,GreenFuture Industries',
    'meta,industry,Industrial Manufacturing,Industrial Manufacturing',
    'meta,previous_year,2024,2024',
    'meta,reporting_year,2025,2025',
    'metric,Carbon Emissions (tonnes CO2e),1000,880',
    'metric,Water Consumption (KL),50000,65000',
    'metric,Energy Consumption (MWh),null,null',
    'metric,Renewable Energy Usage (%),20,55',
    'metric,Waste Generated (tonnes),500,700',
    'metric,Waste Recycled (tonnes),200,250',
    'claim,Claim,"","Carbon emissions reduced by 40%."',
    'claim,Claim,"","Renewable energy usage increased to 55%."',
    'claim,Claim,"","Water conservation improved by 20%."',
    'claim,Claim,"","Waste recycling performance improved significantly."',
  ].join('\n');
}
