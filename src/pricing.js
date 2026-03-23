export function calculatePrice(req) {
  const base = 0.002;
  const bodyBytes = Buffer.byteLength(JSON.stringify(req.body || ''));
  const surchargeUnits = Math.max(0, Math.ceil((bodyBytes - 1024) / 10240));
  const surcharge = surchargeUnits * 0.001;
  const attest = req.query.attest === 'true' ? 0.001 : 0;
  const total = base + surcharge + attest;
  return '$' + total.toFixed(3);
}
