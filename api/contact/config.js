const { sendJson } = require("../../lib/contact.js");

module.exports = function contactConfigHandler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { ok: false, error: "Método no permitido." });
  }

  const enabled = Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
  return sendJson(response, 200, {
    turnstile: {
      enabled,
      siteKey: enabled ? process.env.TURNSTILE_SITE_KEY : undefined,
    },
  });
};

