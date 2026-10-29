/* Optional real photographs for evidence.
 * Drop image files into /public/images/evidence/ and map them here by frame id (CCTV) or key.
 * Anything not listed falls back to the drawn evidence in the app.
 *
 * Example:
 *   "F-11": "/images/evidence/cam02-corridor-2141.jpg",
 */
export const EVIDENCE_IMAGES: Record<string, string> = {};
