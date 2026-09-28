const { sendJson, submitContact } = require("../lib/contact.js");

function getRequestContext(request) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = String(forwardedHost || request.headers.host || "").split(",")[0].trim();
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = String(forwardedProtocol || "https").split(",")[0].trim();
  let hostname = host.split(":")[0];
  let origin = `${protocol}://${host}`;

  try {
    const parsed = new URL(origin);
    hostname = parsed.hostname;
    origin = parsed.origin;
  } catch {
    // A missing or malformed Host header is rejected by the origin check below.
  }

  return { hostname, origin };
}

function parseBody(body) {
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8"));
  if (typeof body === "string") return JSON.parse(body);
  return null;
}

module.exports = async function contactHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { ok: false, error: "Método no permitido." });
  }

  const { hostname, origin: requestOrigin } = getRequestContext(request);
  const origin = request.headers.origin;
  const fetchSite = request.headers["sec-fetch-site"];
  if (!hostname || (origin && origin !== requestOrigin) || (fetchSite && fetchSite !== "same-origin")) {
    return sendJson(response, 403, { ok: false, error: "Solicitud no permitida." });
  }

  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return sendJson(response, 415, { ok: false, error: "Formato no permitido." });
  }

  if (Number(request.headers["content-length"] || 0) > 20000) {
    return sendJson(response, 413, { ok: false, error: "La solicitud es demasiado extensa." });
  }

  let payload;
  try {
    payload = parseBody(request.body);
  } catch {
    return sendJson(response, 400, { ok: false, error: "No fue posible leer la solicitud." });
  }

  if (!payload) {
    return sendJson(response, 400, { ok: false, error: "No fue posible leer la solicitud." });
  }

  const result = await submitContact(payload, process.env, { expectedHostname: hostname });
  return sendJson(response, result.status, result.body);
};

