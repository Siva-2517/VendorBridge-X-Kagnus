import multer from 'multer';
import path from 'path';

// In-memory buffer storage so files are streamed directly into PostgreSQL Bytes
// Guarantees persistence across server restarts and container rebuilds on Render
const storage = multer.memoryStorage();

// Strict mapping of allowed file extensions to their legitimate MIME types
const EXTENSION_MIME_MAP: Record<string, Set<string>> = {
  '.pdf': new Set(['application/pdf']),
  '.png': new Set(['image/png']),
  '.jpg': new Set(['image/jpeg']),
  '.jpeg': new Set(['image/jpeg']),
  '.webp': new Set(['image/webp']),
  '.docx': new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  '.xlsx': new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  '.txt': new Set(['text/plain']),
  // Allow legitimate Excel-generated CSV MIME types only when compatible with .csv extension
  '.csv': new Set([
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/csv',
    'text/x-csv',
  ]),
};

export const ALLOWED_EXTENSIONS = new Set(Object.keys(EXTENSION_MIME_MAP));

export const rfqUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new Error(`Disallowed file extension: ${ext || 'none'}. Allowed: PDF, PNG, JPG, DOCX, XLSX, TXT, CSV.`)
      );
    }

    const allowedMimesForExt = EXTENSION_MIME_MAP[ext];
    const clientMime = file.mimetype.toLowerCase();
    if (!allowedMimesForExt || !allowedMimesForExt.has(clientMime)) {
      return cb(
        new Error(
          `Incompatible MIME type '${file.mimetype}' for extension '${ext}'. File content must match declared extension.`
        )
      );
    }

    cb(null, true);
  },
});

export function validateFileSignature(buffer: Buffer, mimeType: string, filename?: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const ext = filename ? path.extname(filename).toLowerCase() : '';
  const lowerMime = mimeType.toLowerCase();

  // 1. PDF: %PDF (0x25 0x50 0x44 0x46)
  if (lowerMime === 'application/pdf' || ext === '.pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // 2. PNG: 89 50 4E 47
  if (lowerMime === 'image/png' || ext === '.png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // 3. JPEG: FF D8 FF
  if (lowerMime === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // 4. WEBP: RIFF....WEBP
  if (lowerMime === 'image/webp' || ext === '.webp') {
    return (
      buffer.toString('utf-8', 0, 4) === 'RIFF' &&
      buffer.length >= 12 &&
      buffer.toString('utf-8', 8, 12) === 'WEBP'
    );
  }

  // 5. DOCX / XLSX: ZIP container starting with PK\x03\x04
  if (
    lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === '.docx' ||
    ext === '.xlsx'
  ) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }

  // 6. Text / CSV (including Excel-generated CSV): No binary null control characters in initial sample
  if (
    lowerMime === 'text/plain' ||
    lowerMime === 'text/csv' ||
    lowerMime === 'application/vnd.ms-excel' ||
    lowerMime === 'application/csv' ||
    lowerMime === 'text/x-csv' ||
    ext === '.txt' ||
    ext === '.csv'
  ) {
    const probe = buffer.subarray(0, Math.min(buffer.length, 512));
    return !probe.includes(0x00);
  }

  return true;
}
