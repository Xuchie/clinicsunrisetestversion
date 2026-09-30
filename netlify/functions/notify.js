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

  const { name, phone, date, reason } = data;

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

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Network error calling Telegram:", err);
    return { statusCode: 500, body: "Failed to reach Telegram" };
  }
};
