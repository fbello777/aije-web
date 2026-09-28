const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildEmail,
  getReference,
  submitContact,
  validatePayload,
} = require("../lib/contact.js");

const validPayload = {
  name: "María López",
  company: "Empresa Ejemplo",
  email: "compras@empresa.mx",
  requirement: "Necesitamos 25 toneladas con entrega en Veracruz.",
  website: "",
  privacyAcknowledgement: true,
  submissionId: "8f4d7b6c-1234-4abc-9def-123456789abc",
  turnstileToken: "",
};

test("genera el folio esperado a partir del UUID", () => {
  assert.equal(getReference(validPayload.submissionId), "8F4D7B6C");
});

test("valida y normaliza una solicitud completa", () => {
  const result = validatePayload({
    ...validPayload,
    name: "  María   López  ",
    email: "COMPRAS@EMPRESA.MX",
  });

  assert.equal(result.valid, true);
  assert.equal(result.value.name, "María López");
  assert.equal(result.value.email, "compras@empresa.mx");
  assert.equal(result.value.reference, "8F4D7B6C");
});

test("rechaza solicitudes incompletas", () => {
  const result = validatePayload({
    ...validPayload,
    email: "correo-invalido",
    privacyAcknowledgement: false,
  });

  assert.equal(result.valid, false);
});

test("escapa datos al construir el correo HTML", () => {
  const email = buildEmail({
    name: "<María>",
    company: "A & B",
    email: "compras@example.com",
    requirement: "Producto <especial>",
    reference: "8F4D7B6C",
  });

  assert.match(email.html, /&lt;María&gt;/);
  assert.match(email.html, /A &amp; B/);
  assert.doesNotMatch(email.html, /Producto <especial>/);
});

test("envía el correo y devuelve un folio", async () => {
  let resendRequest;
  const fakeFetch = async (url, init) => {
    resendRequest = { url, init };
    return { ok: true, status: 200 };
  };

  const result = await submitContact(
    validPayload,
    {
      CONTACT_FROM_EMAIL: "AIJE <formularios@aije.mx>",
      CONTACT_TO_EMAIL: "direccion@aije.mx",
      RESEND_API_KEY: "test-key",
    },
    { expectedHostname: "aije.mx", fetchImplementation: fakeFetch },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true, reference: "8F4D7B6C" });
  assert.equal(resendRequest.url, "https://api.resend.com/emails");
  const message = JSON.parse(resendRequest.init.body);
  assert.deepEqual(message.to, ["direccion@aije.mx"]);
  assert.equal(message.reply_to, "compras@empresa.mx");
});

