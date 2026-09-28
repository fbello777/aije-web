const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const home = readFileSync(path.join(root, "index.html"), "utf8");
const privacy = readFileSync(path.join(root, "aviso-de-privacidad/index.html"), "utf8");

test("conserva la identidad y el contenido final de AIJE", () => {
  assert.match(home, /Lo que tu operación necesita\./);
  assert.match(home, /Nosotros lo encontramos\./);
  assert.match(home, /Industrial/);
  assert.match(home, /Institucional y gobierno/);
  assert.match(home, /direccion@aije\.mx/);
  assert.doesNotMatch(home, /AIJE Intelligence/i);
});

test("incluye formulario, aceptación y aviso integral", () => {
  assert.match(home, /class="quote-form"/);
  assert.match(home, /privacyAcknowledgement/);
  assert.match(home, /\/aviso-de-privacidad/);
  assert.match(privacy, /Derechos ARCO/);
  assert.match(privacy, /AIJE Comercializadora y Servicios, S\.A\. de C\.V\./);
});

test("todas las imágenes locales referidas existen", () => {
  const references = [...home.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((match) => match[1]);
  references.push(...[...privacy.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((match) => match[1]));

  for (const reference of new Set(references)) {
    assert.equal(existsSync(path.join(root, reference)), true, `${reference} no existe`);
  }
});

test("la recuperación está desacoplada del runtime Vinext", () => {
  assert.doesNotMatch(home, /VINEXT|page-CssH0ZH1|index-BbCinT9F/);
  assert.match(home, /\/script\.js/);
});

