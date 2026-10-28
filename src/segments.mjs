const DAY = 86_400_000;

function parseTime(value) {
  const t = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(t)) throw new TypeError(`Invalid date: ${value}`);
  return t;
}

// Exact decimal value of a finite number's shortest representation, as digits * 10^-scale.
// Avoids binary float drift (e.g. 100.18 + 414.97 + 484.85 !== 1000) and order dependence.
function toDecimal(n) {
  const [mantissa, exp = "0"] = String(n).split("e");
  const [int, frac = ""] = mantissa.split(".");
  let digits = BigInt(int + frac);
  let scale = frac.length - Number(exp);
  if (scale < 0) {
    digits *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { digits, scale };
}

function exceedsExactSum(amounts, threshold) {
  const parts = amounts.map(toDecimal);
  const scale = parts.reduce((max, p) => Math.max(max, p.scale), 0);
  let sum = 0n;
  for (const p of parts) sum += p.digits * 10n ** BigInt(scale - p.scale);
  return sum > BigInt(threshold) * 10n ** BigInt(scale);
}

export function segmentsFor(contact, now) {
  const { source, isRegistered, purchases, calls } = contact;
  if (!Array.isArray(purchases)) throw new TypeError("purchases must be an array");
  if (!Array.isArray(calls)) throw new TypeError("calls must be an array");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("now must be a valid Date");
  }

  const nowMs = now.getTime();
  const buys = purchases.map((p) => {
    const amount = p?.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      throw new TypeError(`Invalid amount: ${amount}`);
    }
    return { at: parseTime(p.at), amount };
  });
  const callTimes = calls.map((c) => parseTime(c?.startedAt));

  if (contact.marketingOptIn === false) return [];

  const segments = [];

  if (source === "wix_form" && !isRegistered) segments.push("wix_lead");
  if (isRegistered && buys.length === 0) segments.push("registered_no_purchase");
  if (buys.length >= 1 && callTimes.length === 0) segments.push("purchased_no_call");

  if (callTimes.length >= 1) {
    let firstCall = Infinity;
    for (const t of callTimes) if (t < firstCall) firstCall = t;
    if (nowMs - firstCall >= 14 * DAY && !buys.some((b) => b.at > firstCall)) {
      segments.push("first_call_no_repurchase");
    }
  }

  if (buys.length >= 2) segments.push("repeat");

  if (buys.length >= 1) {
    let lastPurchase = -Infinity;
    for (const b of buys) if (b.at > lastPurchase) lastPurchase = b.at;
    if (nowMs - lastPurchase >= 60 * DAY) segments.push("inactive");
  }

  const cutoff = nowMs - 30 * DAY;
  const recentAmounts = buys.filter((b) => b.at > cutoff).map((b) => b.amount);
  if (exceedsExactSum(recentAmounts, 1000)) segments.push("heavy");

  return segments.sort();
}
