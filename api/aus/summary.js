import { handleAusSummary } from '../../server/routes/aus.mjs';
export default async function handler(req, res) {
  // Vercel hobby limit ~10s: tighter upstream timeouts than local dev
  await handleAusSummary(req, res, { bomMs: 6000, otherMs: 6000 });
}
