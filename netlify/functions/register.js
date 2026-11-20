// Netlify Function  ->  /.netlify/functions/register  (di-redirect dari /api/register)
const { handleRegistration } = require("../../lib/register");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, errors: ["Method not allowed"] });
  }

  let body;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "{}";
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, errors: ["Body JSON tidak valid."] });
  }

  const result = await handleRegistration(body);
  return json(result.status, result.body);
};
