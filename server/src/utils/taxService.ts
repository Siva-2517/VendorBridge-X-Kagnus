import { Prisma } from '@prisma/client';
import { TaxBreakdown, TaxBreakdownType } from '../types';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z0-9]{13}$/;

export interface TaxCalculationInput {
  subtotal: Prisma.Decimal;
  taxRatePercent: Prisma.Decimal | number | null | undefined;
  vendorGstin?: string | null;
  vendorState?: string | null;
  deliveryLocation?: string | null;
  buyerState?: string | null;
}

export interface TaxCalculationResult {
  subtotalAmount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  taxBreakdown: TaxBreakdown;
}

// Comprehensive Indian GST State Code Table
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

/**
 * Validates a GSTIN string and extracts its 2-digit state code.
 * Throws a clear error if the GSTIN format is invalid or state code is unrecognized.
 */
export const validateAndExtractGstinStateCode = (gstin?: string | null): string | null => {
  if (!gstin || !gstin.trim()) {
    return null;
  }

  const cleanGstin = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(cleanGstin)) {
    throw new Error(
      `Invalid GSTIN format: '${gstin}'. Expected a 15-character alphanumeric format starting with a 2-digit state code (e.g. 27AABC1576214B0)`
    );
  }

  const stateCode = cleanGstin.substring(0, 2);
  if (!GST_STATE_CODES[stateCode]) {
    throw new Error(
      `Invalid GSTIN state code: '${stateCode}' in GSTIN '${gstin}'. State code is not recognized in Indian GST master.`
    );
  }

  return stateCode;
};

/**
 * Resolves state code from location string or explicit state name.
 * Does NOT infer or assume a hardcoded state.
 */
export const resolveStateFromLocation = (locationOrState?: string | null): string | null => {
  if (!locationOrState || !locationOrState.trim()) {
    return null;
  }

  const loc = locationOrState.toLowerCase().trim();

  // Maharashtra (27)
  if (
    loc.includes('maharashtra') ||
    loc.includes('mumbai') ||
    loc.includes('pune') ||
    loc.includes('nagpur') ||
    loc.includes('nashik') ||
    loc.includes('thane') ||
    loc.includes('aurangabad')
  ) {
    return '27';
  }

  // Karnataka (29)
  if (
    loc.includes('karnataka') ||
    loc.includes('bengaluru') ||
    loc.includes('bangalore') ||
    loc.includes('mysore') ||
    loc.includes('mangalore') ||
    loc.includes('hubli')
  ) {
    return '29';
  }

  // Telangana (36)
  if (
    loc.includes('telangana') ||
    loc.includes('hyderabad') ||
    loc.includes('secunderabad') ||
    loc.includes('warangal')
  ) {
    return '36';
  }

  // Tamil Nadu (33)
  if (
    loc.includes('tamil nadu') ||
    loc.includes('chennai') ||
    loc.includes('coimbatore') ||
    loc.includes('madurai')
  ) {
    return '33';
  }

  // Gujarat (24)
  if (
    loc.includes('gujarat') ||
    loc.includes('ahmedabad') ||
    loc.includes('surat') ||
    loc.includes('vadodara') ||
    loc.includes('rajkot')
  ) {
    return '24';
  }

  // Delhi (07)
  if (loc.includes('delhi') || loc.includes('new delhi')) {
    return '07';
  }

  // Uttar Pradesh (09)
  if (
    loc.includes('uttar pradesh') ||
    loc.includes('noida') ||
    loc.includes('lucknow') ||
    loc.includes('kanpur') ||
    loc.includes('agra') ||
    loc.includes('ghaziabad')
  ) {
    return '09';
  }

  // West Bengal (19)
  if (loc.includes('west bengal') || loc.includes('kolkata') || loc.includes('howrah')) {
    return '19';
  }

  // Rajasthan (08)
  if (loc.includes('rajasthan') || loc.includes('jaipur') || loc.includes('jodhpur') || loc.includes('udaipur')) {
    return '08';
  }

  // Haryana (06)
  if (loc.includes('haryana') || loc.includes('gurugram') || loc.includes('gurgaon') || loc.includes('faridabad')) {
    return '06';
  }

  // Punjab (03)
  if (loc.includes('punjab') || loc.includes('ludhiana') || loc.includes('amritsar') || loc.includes('jalandhar')) {
    return '03';
  }

  // Kerala (32)
  if (loc.includes('kerala') || loc.includes('kochi') || loc.includes('thiruvananthapuram') || loc.includes('calicut')) {
    return '32';
  }

  // Andhra Pradesh (37)
  if (loc.includes('andhra pradesh') || loc.includes('visakhapatnam') || loc.includes('vijayawada')) {
    return '37';
  }

  // Madhya Pradesh (23)
  if (loc.includes('madhya pradesh') || loc.includes('bhopal') || loc.includes('indore')) {
    return '23';
  }

  // Goa (30)
  if (loc.includes('goa') || loc.includes('panaji')) {
    return '30';
  }

  return null;
};

/**
 * Calculates authoritative GST tax breakdown using Prisma.Decimal.
 * - Does not assume any default buyer state.
 * - Does not assume any default tax rate.
 * - Validates GSTIN format when provided.
 * - Requires resolvable buyer and vendor state to determine CGST/SGST vs IGST.
 */
export const calculateTaxBreakdown = (
  input: TaxCalculationInput
): TaxCalculationResult => {
  // 1. Validate Tax Rate (No assumptions or hardcoded fallbacks)
  if (input.taxRatePercent === null || input.taxRatePercent === undefined) {
    throw new Error('Missing tax information: Source tax rate is required and cannot be assumed');
  }

  const taxRate = new Prisma.Decimal(input.taxRatePercent.toString());
  if (taxRate.isNegative()) {
    throw new Error('Tax rate cannot be negative');
  }

  // 2. Validate Subtotal
  if (!input.subtotal) {
    throw new Error('Subtotal is required to calculate tax');
  }
  const subtotal = new Prisma.Decimal(input.subtotal.toString()).toDecimalPlaces(2);
  if (subtotal.isNegative()) {
    throw new Error('Subtotal cannot be negative');
  }

  // 3. Mathematical Totals using Decimal
  const taxAmount = subtotal.mul(taxRate).div(100).toDecimalPlaces(2);
  const grandTotal = subtotal.add(taxAmount).toDecimalPlaces(2);

  // 4. Resolve Vendor State (from validated GSTIN or explicit state name)
  let vendorStateCode: string | null = null;
  if (input.vendorGstin) {
    vendorStateCode = validateAndExtractGstinStateCode(input.vendorGstin);
  }
  if (!vendorStateCode && input.vendorState) {
    vendorStateCode = resolveStateFromLocation(input.vendorState);
  }

  if (!vendorStateCode) {
    throw new Error(
      'Cannot determine GST tax breakdown: Vendor GST state could not be resolved. A valid GSTIN or vendor state is required.'
    );
  }

  // 5. Resolve Buyer State (from delivery location or buyer state - NO HARDCODED DEFAULTS)
  const buyerStateCode =
    resolveStateFromLocation(input.deliveryLocation) ||
    resolveStateFromLocation(input.buyerState);

  if (!buyerStateCode) {
    throw new Error(
      `Cannot determine GST tax breakdown: Buyer delivery location state could not be resolved from '${input.deliveryLocation || input.buyerState || ''}'. Valid state information is required.`
    );
  }

  // 6. Determine Breakdown Type
  let breakdownType: TaxBreakdownType = 'STANDARD';
  let isInterState = false;

  let cgstRate: number | undefined;
  let cgstAmount: number | undefined;
  let sgstRate: number | undefined;
  let sgstAmount: number | undefined;
  let igstRate: number | undefined;
  let igstAmount: number | undefined;

  if (vendorStateCode === buyerStateCode) {
    // Intra-state supply: CGST + SGST (split taxRate equally)
    breakdownType = 'CGST_SGST';
    isInterState = false;
    const halfRate = taxRate.div(2);
    cgstRate = halfRate.toNumber();
    sgstRate = halfRate.toNumber();

    const calculatedCgst = subtotal.mul(halfRate).div(100).toDecimalPlaces(2);
    cgstAmount = calculatedCgst.toNumber();
    // Reconcile: sgstAmount = taxAmount - calculatedCgst to guarantee exact 0-drift sum
    sgstAmount = taxAmount.sub(calculatedCgst).toNumber();
  } else {
    // Inter-state supply: Integrated GST (IGST)
    breakdownType = 'IGST';
    isInterState = true;
    igstRate = taxRate.toNumber();
    igstAmount = taxAmount.toNumber();
  }

  const taxBreakdown: TaxBreakdown = {
    type: breakdownType,
    taxRate: taxRate.toNumber(),
    totalTaxAmount: taxAmount.toNumber(),
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    isInterState,
  };

  return {
    subtotalAmount: subtotal,
    taxRate,
    taxAmount,
    grandTotal,
    taxBreakdown,
  };
};
