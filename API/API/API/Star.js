export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const state = global.__BOT_STATE__;
  if (!state) {
    res.status(200).json({ ok: true, running: false, sent: 0, rate: 0, time: 0, error: null });
    return;
  }
  const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
  res.status(200).json({
    ok: true,
    running: state.running,
    sent: state.sent,
    rate: state.sent / Math.max(elapsed, 0.001),
    time: elapsed,
    error: state.error || null
  });
}
