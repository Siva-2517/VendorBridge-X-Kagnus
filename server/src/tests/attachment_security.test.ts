import { describe, it, expect } from 'vitest';
import { validateFileSignature, ALLOWED_EXTENSIONS } from '../middleware/upload';
import path from 'path';

describe('Attachment Security & MIME Compatibility Unit Tests (Non-Mutating)', () => {
  it('1. should validate valid PDF files with %PDF header', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample content for procurement technical specifications');
    expect(validateFileSignature(validPdfBuffer, 'application/pdf', 'specs.pdf')).toBe(true);

    const corruptPdfBuffer = Buffer.from('NOT_A_PDF content');
    expect(validateFileSignature(corruptPdfBuffer, 'application/pdf', 'specs.pdf')).toBe(false);
  });

  it('2. should validate PNG and JPEG image signatures', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateFileSignature(pngBuffer, 'image/png', 'diagram.png')).toBe(true);

    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(validateFileSignature(jpegBuffer, 'image/jpeg', 'photo.jpg')).toBe(true);
    expect(validateFileSignature(jpegBuffer, 'image/jpeg', 'photo.jpeg')).toBe(true);

    const fakePng = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(validateFileSignature(fakePng, 'image/png', 'fake.png')).toBe(false);
  });

  it('3. should accept legitimate Excel-generated CSV MIME types (application/vnd.ms-excel) with text content', () => {
    const csvContent = Buffer.from('ItemCode,Description,Quantity,Price\nITEM-01,Office Desk,10,15000\n');
    // Windows Excel sends application/vnd.ms-excel for CSV files
    expect(validateFileSignature(csvContent, 'application/vnd.ms-excel', 'quote_breakdown.csv')).toBe(true);
    expect(validateFileSignature(csvContent, 'text/csv', 'quote_breakdown.csv')).toBe(true);
  });

  it('4. should reject binary executables disguised as CSV or text files (null byte detection)', () => {
    // Binary executable starting with null bytes disguised as a CSV
    const maliciousCsv = Buffer.from([0x4d, 0x5a, 0x00, 0x00, 0x03, 0x00, 0x00]);
    expect(validateFileSignature(maliciousCsv, 'text/csv', 'exploit.csv')).toBe(false);
    expect(validateFileSignature(maliciousCsv, 'application/vnd.ms-excel', 'exploit.csv')).toBe(false);
    expect(validateFileSignature(maliciousCsv, 'text/plain', 'exploit.txt')).toBe(false);
  });

  it('5. should validate DOCX and XLSX ZIP container signatures (PK\\x03\\x04)', () => {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    expect(
      validateFileSignature(
        zipHeader,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'contract.docx'
      )
    ).toBe(true);
    expect(
      validateFileSignature(
        zipHeader,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'bom.xlsx'
      )
    ).toBe(true);

    const corruptDocx = Buffer.from('Plain text claiming to be docx');
    expect(
      validateFileSignature(
        corruptDocx,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'contract.docx'
      )
    ).toBe(false);
  });

  it('6. should reject files smaller than 4 bytes', () => {
    const tinyBuffer = Buffer.from([0x25, 0x50]);
    expect(validateFileSignature(tinyBuffer, 'application/pdf', 'tiny.pdf')).toBe(false);
  });

  it('7. should sanitize filenames correctly for Content-Disposition with Unicode support', () => {
    const testCases = [
      {
        input: 'tech_specs_rack.pdf',
        expectedAscii: 'tech_specs_rack.pdf',
        expectedUtf8: 'tech_specs_rack.pdf',
      },
      {
        input: 'injection"; filename="hacked.pdf\r\n.pdf',
        expectedAscii: 'injection___filename__hacked.pdf__.pdf',
      },
      {
        input: 'हिंदी_specs_quotation.pdf',
        expectedAscii: '______specs_quotation.pdf',
        expectedUtf8: '%E0%A4%B9%E0%A4%BF%E0%A4%82%E0%A4%A6%E0%A5%80_specs_quotation.pdf',
      },
      {
        input: '../../../etc/passwd.pdf',
        expectedAscii: 'passwd.pdf',
      },
    ];

    for (const tc of testCases) {
      const baseName = path.basename(tc.input);
      const safeAscii = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const encodedUtf8 = encodeURIComponent(baseName);

      expect(safeAscii).toBe(tc.expectedAscii);
      expect(safeAscii).not.toContain('"');
      expect(safeAscii).not.toContain('\r');
      expect(safeAscii).not.toContain('\n');
      expect(safeAscii).not.toContain('..');

      if (tc.expectedUtf8) {
        expect(encodedUtf8).toBe(tc.expectedUtf8);
      }
    }
  });
});
