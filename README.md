# AIJE Comercializadora

Versión final recuperada del sitio corporativo de **AIJE — Abastecimiento Integral Justo y Eficiente**.

Incluye:

- diseño responsive con la identidad oficial de AIJE;
- fotografías y líneas de negocio Industrial, Alimentos e ingredientes, Suministros generales e Institucional y gobierno;
- formulario de cotización con folio de recepción;
- envío a `direccion@aije.mx` mediante Resend;
- protección opcional con Cloudflare Turnstile;
- aviso de privacidad integral en una página independiente.

AIJE Intelligence es un proyecto separado y no forma parte de este repositorio.

## Desarrollo y pruebas

No hay dependencias de frontend: el sitio se sirve como HTML, CSS y JavaScript estáticos, con dos funciones serverless para el formulario.

```bash
npm test
```

Para probar sólo la interfaz estática:

```bash
python3 -m http.server 3000
```

Para probar también las funciones de Vercel, usa `vercel dev` con las variables de entorno configuradas.

## Variables de entorno

Copia `.env.example` a `.env.local` para desarrollo y configura las mismas variables en Vercel:

| Variable | Uso |
| --- | --- |
| `CONTACT_FROM_EMAIL` | Remitente verificado en Resend |
| `CONTACT_TO_EMAIL` | Destino de las solicitudes |
| `RESEND_API_KEY` | Credencial para enviar el correo |
| `TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Clave privada de Cloudflare Turnstile |

Turnstile se activa únicamente cuando ambas claves están presentes. Nunca subas secretos al repositorio.

## Recuperación

La interfaz, los recursos visuales, el aviso de privacidad y el comportamiento del formulario se recuperaron del último artefacto funcional. El boceto HTML incompleto que estaba antes en `main` fue sustituido por esta versión desplegable.

