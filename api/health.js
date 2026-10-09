import { handleHealth } from '../server/routes/health.mjs';
export default function handler(req, res) {
  handleHealth(req, res);
}
