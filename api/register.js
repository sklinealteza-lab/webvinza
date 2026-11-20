// Vercel Serverless Function  ->  POST /api/register
const { handleRegistration } = require("../lib/register");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, errors: ["Method not allowed"] });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, errors: ["Body JSON tidak valid."] });
    }
  }

  const result = await handleRegistration(body);
  return res.status(result.status).json(result.body);
};
