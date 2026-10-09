import { handleGaQuakes } from '../../server/routes/aus.mjs';
export default async function handler(req, res) {
  await handleGaQuakes(req, res);
}
