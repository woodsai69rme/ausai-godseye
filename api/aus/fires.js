import { handleNswFires } from '../../server/routes/aus.mjs';
export default async function handler(req, res) {
  await handleNswFires(req, res);
}
