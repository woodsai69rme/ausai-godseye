import { handleBomWarnings } from '../../server/routes/aus.mjs';
export default async function handler(req, res) {
  await handleBomWarnings(req, res);
}
