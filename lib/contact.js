const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function cleanSingleLine(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanMultiline(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function isBusinessEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function getReference(submissionId) {
  return submissionId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function validatePayload(payload) {
  const name = cleanSingleLine(payload?.name, 120);
  const company = cleanSingleLine(payload?.company, 160);
  const email = cleanSingleLine(payload?.email, 254).toLowerCase();
  const requirement = cleanMultiline(payload?.requirement, 4000);
  const website = cleanSingleLine(payload?.website, 200);
  const submissionId = cleanSingleLine(payload?.submissionId, 80);
  const turnstileToken = cleanSingleLine(payload?.turnstileToken, 2048);

  const valid =
    name.length >= 2 &&
    company.length >= 2 &&
    requirement.length >= 10 &&
    isBusinessEmail(email) &&
    payload?.privacyAcknowledgement === true &&
    /^[a-f0-9-]{36}$/i.test(submissionId);

  return {
    valid,
    value: {
      name,
      company,
      email,
      requirement,
      website,
      submissionId,
      turnstileToken,
      reference: getReference(submissionId),
    },
  };
}

async function verifyTurnstile(token, secret, expectedHostname, fetchImplementation = fetch) {
  const verificationBody = new FormData();
  verificationBody.set("secret", secret);
  verificationBody.set("response", token);
  verificationBody.set("idempotency_key", crypto.randomUUID());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetchImplementation("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verificationBody,
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("Turnstile verification service returned an error.", response.status);
      return { verified: false, unavailable: true };
    }

    const result = await response.json();
    const verified = Boolean(
      result.success &&
      result.action === "contact_request" &&
      result.hostname === expectedHostname,
    );
    if (!verified) {
      console.warn(
        "Turnstile rejected a contact form request.",
        result["error-codes"]?.join(",") || "unknown-error",
      );
    }
    return { verified, unavailable: false };
  } catch (error) {
    console.error(
      "Turnstile verification request failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { verified: false, unavailable: true };
  } finally {
    clearTimeout(timeout);
  }
}

function buildEmail({ name, company, email, requirement, reference }) {
  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(company);
  const safeEmail = escapeHtml(email);
  const safeRequirement = escapeHtml(requirement).replace(/\n/g, "<br />");
  const text = [
    "Nueva solicitud de cotización desde aije.mx",
    "",
    `Nombre: ${name}`,
    `Empresa: ${company}`,
    `Correo: ${email}`,
    `Folio: ${reference}`,
    "",
    "Requerimiento:",
    requirement,
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0d1b3d;line-height:1.6;max-width:640px">
      <h1 style="font-size:22px;margin:0 0 20px">Nueva solicitud de cotización</h1>
      <table role="presentation" style="border-collapse:collapse;width:100%;margin-bottom:20px">
        <tr><td style="padding:8px 0;font-weight:700;width:120px">Nombre</td><td style="padding:8px 0">${safeName}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700">Empresa</td><td style="padding:8px 0">${safeCompany}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700">Correo</td><td style="padding:8px 0"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:700">Folio</td><td style="padding:8px 0">${reference}</td></tr>
      </table>
      <h2 style="font-size:17px;margin:0 0 8px">Requerimiento</h2>
      <div style="background:#f2f4f7;border-left:4px solid #0ea5a0;padding:16px">${safeRequirement}</div>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">Enviado desde el formulario de aije.mx.</p>
    </div>`;

  return { html, text };
}

async function submitContact(payload, env = process.env, options = {}) {
  if (typeof payload?.website === "string" && payload.website.trim()) {
    return { status: 200, body: { ok: true } };
  }

  const { valid, value } = validatePayload(payload);
  if (!valid) {
    return {
      status: 422,
      body: { ok: false, error: "Revisa los datos del formulario." },
    };
  }

  const turnstileConfigured = Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
  if (Boolean(env.TURNSTILE_SITE_KEY || env.TURNSTILE_SECRET_KEY) && !turnstileConfigured) {
    console.error("Turnstile configuration is incomplete.");
    return {
      status: 503,
      body: { ok: false, error: "La verificación de seguridad no está disponible temporalmente." },
    };
  }

  if (turnstileConfigured) {
    if (!value.turnstileToken) {
      return {
        status: 403,
        body: { ok: false, error: "Completa la verificación de seguridad." },
      };
    }

    const turnstileResult = await verifyTurnstile(
      value.turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      options.expectedHostname,
      options.fetchImplementation,
    );
    if (!turnstileResult.verified) {
      return {
        status: turnstileResult.unavailable ? 503 : 403,
        body: {
          ok: false,
          error: turnstileResult.unavailable
            ? "La verificación de seguridad no está disponible. Intenta nuevamente."
            : "No pudimos validar la verificación de seguridad. Intenta nuevamente.",
        },
      };
    }
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    console.error("Contact form email configuration is incomplete.");
    return {
      status: 503,
      body: { ok: false, error: "El servicio de contacto no está disponible temporalmente." },
    };
  }

  const { html, text } = buildEmail(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const fetchImplementation = options.fetchImplementation || fetch;
    const resendResponse = await fetchImplementation("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `aije-contact-${value.submissionId}`,
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: value.email,
        subject: `Nueva solicitud de cotización — ${value.company}`,
        text,
        html,
      }),
      signal: controller.signal,
    });

    if (!resendResponse.ok) {
      console.error("Resend rejected a contact form email.", resendResponse.status);
      return {
        status: 502,
        body: { ok: false, error: "No pudimos enviar la solicitud. Intenta nuevamente." },
      };
    }
  } catch (error) {
    console.error(
      "Contact form email request failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return {
      status: 502,
      body: { ok: false, error: "No pudimos enviar la solicitud. Intenta nuevamente." },
    };
  } finally {
    clearTimeout(timeout);
  }

  console.info("Contact form request accepted.", value.reference);
  return { status: 200, body: { ok: true, reference: value.reference } };
}

function sendJson(response, status, body) {
  Object.entries(JSON_HEADERS).forEach(([name, value]) => response.setHeader(name, value));
  response.status(status).json(body);
}

module.exports = {
  JSON_HEADERS,
  buildEmail,
  cleanMultiline,
  cleanSingleLine,
  escapeHtml,
  getReference,
  sendJson,
  submitContact,
  validatePayload,
  verifyTurnstile,
};

