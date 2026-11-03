// Rate limiting store (persists across warm serverless invocations)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes cooldown per device / IP
const submissionRecords = new Map();

const getHeader = (headers, name) => {
  if (!headers) return null;
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      return headers[key];
    }
  }
  return null;
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid request body" };
  }

  const { name, phone, date, reason, deviceId } = data;

  // Identify client by IP and device identifier
  const rawForwarded = getHeader(event.headers, "x-forwarded-for");
  const clientIp =
    getHeader(event.headers, "x-nf-client-connection-ip") ||
    getHeader(event.headers, "client-ip") ||
    (rawForwarded ? rawForwarded.split(",")[0].trim() : null) ||
    "unknown";

  const now = Date.now();

  // Prune expired rate limit entries
  for (const [key, timestamp] of submissionRecords.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
      submissionRecords.delete(key);
    }
  }

  // Check rate limit by device ID and client IP
  const keysToCheck = [];
  if (deviceId && typeof deviceId === "string" && deviceId.trim()) {
    keysToCheck.push(`dev:${deviceId.trim()}`);
  }
  if (clientIp && clientIp !== "unknown") {
    keysToCheck.push(`ip:${clientIp}`);
  }

  let remainingWaitMs = 0;
  for (const key of keysToCheck) {
    const lastTime = submissionRecords.get(key);
    if (lastTime && now - lastTime < RATE_LIMIT_WINDOW_MS) {
      const wait = RATE_LIMIT_WINDOW_MS - (now - lastTime);
      if (wait > remainingWaitMs) {
        remainingWaitMs = wait;
      }
    }
  }

  if (remainingWaitMs > 0) {
    const waitMinutes = Math.ceil(remainingWaitMs / 60000);
    return {
      statusCode: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(remainingWaitMs / 1000)),
      },
      body: JSON.stringify({
        error: `Please wait ${waitMinutes} minute(s) before submitting another appointment request.`,
        retryAfterMs: remainingWaitMs,
      }),
    };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  console.log("TELEGRAM_BOT_TOKEN loaded:", Boolean(token));

  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { statusCode: 500, body: "Server is missing Telegram credentials" };
  }

  const message =
    `📅 New appointment request\n\n` +
    `Name: ${name || "Not provided"}\n` +
    `Phone: ${phone || "Not provided"}\n` +
    `Preferred date: ${date || "Not provided"}\n` +
    `Reason: ${reason || "Not provided"}`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      },
    );

    if (!response.ok) {
      const telegramError = await response.json().catch(() => null);
      const errorMessage =
        telegramError?.description || "Telegram rejected the message";
      console.error("Telegram API error:", telegramError || errorMessage);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: errorMessage }),
      };
    }

    // Record submission time upon successful dispatch
    for (const key of keysToCheck) {
      submissionRecords.set(key, now);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Network error calling Telegram:", err);
    return { statusCode: 500, body: "Failed to reach Telegram" };
  }
};
