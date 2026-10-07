// Fake Web Push service for the bubble push load test
// (w_bot e2e/tests/bubble_broadcast_push_load.md).
//
// The load-test subscriptions point their `endpoint` here instead of at FCM/WNS, so w_bot's
// real sender (VAPID + aes128gcm through pywebpush) runs unchanged against a service we control.
// The body is encrypted and never read: only the status code matters to the sender.
//
// Query string (set per subscription by the fixture):
//   sid         subscription id, makes the 410 share deterministic per device
//   latency_ms  delay before answering (default 100, max 5000)
//   p410        share of devices that always answer 410 Gone (expired), e.g. 0.02
//   p429        chance per request of 429 (retried by the sender), e.g. 0.03
//   p500        chance per request of 500 (retried by the sender), e.g. 0
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// FNV-1a → [0, 1): the same sid always lands in the same bucket, so a device that is "expired"
// stays expired across retries and stages.
const bucket = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x100000000;
};

module.exports = async (req, res) => {
  const query = req.query || {};
  const sid = String(query.sid || "");
  const latency = clamp(toNumber(query.latency_ms, 100), 0, 5000);
  const p410 = clamp(toNumber(query.p410, 0), 0, 1);
  const p429 = clamp(toNumber(query.p429, 0), 0, 1);
  const p500 = clamp(toNumber(query.p500, 0), 0, 1);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  await sleep(latency);

  if (sid && bucket(sid) < p410) {
    res.status(410).end();
    return;
  }
  if (Math.random() < p429) {
    res.setHeader("Retry-After", "1");
    res.status(429).end();
    return;
  }
  if (Math.random() < p500) {
    res.status(500).end();
    return;
  }
  res.status(201).end();
};
