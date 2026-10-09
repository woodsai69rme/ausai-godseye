import { handleFlights } from './_lib/flightsLib.mjs';
export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const url = new URL(req.url, proto + '://' + host);
  await handleFlights(req, res, url.searchParams);
}
