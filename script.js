(() => {
  const arrowIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>';
  const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>';
  const menuIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>';
  const closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  let mobileNav = null;

  function closeMenu() {
    mobileNav?.remove();
    mobileNav = null;
    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menú");
      menuButton.innerHTML = menuIcon;
    }
  }

  menuButton?.addEventListener("click", () => {
    if (mobileNav) {
      closeMenu();
      return;
    }

    mobileNav = document.createElement("nav");
    mobileNav.className = "mobile-nav";
    mobileNav.setAttribute("aria-label", "Navegación móvil");
    mobileNav.innerHTML = [
      '<a href="#nosotros">Qué hacemos</a>',
      '<a href="#lineas">Líneas de negocio</a>',
      '<a href="#ventajas">Por qué AIJE</a>',
      '<a href="#contacto">Solicitar cotización</a>',
    ].join("");
    mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    header?.append(mobileNav);
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Cerrar menú");
    menuButton.innerHTML = closeIcon;
  });

  const form = document.querySelector(".quote-form");
  if (!form) return;

  const privacyButton = form.querySelector("#privacy-acknowledgement");
  const privacyInput = form.querySelector('input[name="privacyAcknowledgement"]');
  const submitButton = form.querySelector(".form-submit");
  const privacyRow = form.querySelector(".privacy-acknowledgement");
  const requirement = form.querySelector("#requirement");
  if (requirement) requirement.minLength = 10;

  let privacyAcknowledged = false;
  let submissionState = "idle";
  let turnstileLoading = true;
  let turnstileSiteKey = "";
  let turnstileToken = "";
  let turnstileError = "";
  let turnstileWidgetId = null;
  let turnstileContainer = null;
  let formError = null;

  function setPrivacyAcknowledged(value) {
    privacyAcknowledged = Boolean(value);
    privacyButton?.setAttribute("aria-checked", String(privacyAcknowledged));
    privacyButton?.setAttribute("data-state", privacyAcknowledged ? "checked" : "unchecked");
    if (privacyButton) privacyButton.innerHTML = privacyAcknowledged ? checkIcon : "";
    if (privacyInput) privacyInput.checked = privacyAcknowledged;
    updateSubmitState();
  }

  function updateSubmitState() {
    if (!submitButton) return;
    submitButton.disabled =
      !privacyAcknowledged ||
      submissionState === "submitting" ||
      turnstileLoading ||
      Boolean(turnstileError) ||
      Boolean(turnstileSiteKey && !turnstileToken);
  }

  function showTurnstileError(message) {
    turnstileError = message;
    let error = form.querySelector(".turnstile-error");
    if (!error) {
      error = document.createElement("div");
      error.className = "turnstile-error";
      error.setAttribute("role", "alert");
      privacyRow?.before(error);
    }
    error.textContent = message;
    updateSubmitState();
  }

  function clearFormError() {
    formError?.remove();
    formError = null;
    if (submissionState !== "submitting") submissionState = "idle";
  }

  function showFormError(message) {
    clearFormError();
    submissionState = "error";
    formError = document.createElement("div");
    formError.className = "form-error";
    formError.setAttribute("role", "alert");
    formError.textContent = `${message} Si el problema continúa, escribe a direccion@aije.mx.`;
    submitButton?.after(formError);
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
    }
    updateSubmitState();
  }

  function renderTurnstile() {
    if (!window.turnstile || !turnstileContainer || turnstileWidgetId !== null) return;
    turnstileWidgetId = window.turnstile.render(turnstileContainer, {
      sitekey: turnstileSiteKey,
      language: "es",
      theme: "light",
      size: "flexible",
      action: "contact_request",
      callback(token) {
        turnstileToken = token;
        turnstileError = "";
        form.querySelector(".turnstile-error")?.remove();
        updateSubmitState();
      },
      "expired-callback"() {
        turnstileToken = "";
        updateSubmitState();
      },
      "error-callback"() {
        turnstileToken = "";
        showTurnstileError("No pudimos completar la verificación de seguridad. Intenta nuevamente.");
      },
    });
  }

  function mountTurnstile() {
    const panel = document.createElement("div");
    panel.className = "turnstile-panel";
    panel.innerHTML = '<div class="turnstile-widget"></div><p>Verificación protegida por Cloudflare Turnstile.</p>';
    privacyRow?.before(panel);
    turnstileContainer = panel.querySelector(".turnstile-widget");

    if (window.turnstile) {
      renderTurnstile();
      return;
    }

    const script = document.createElement("script");
    script.id = "cloudflare-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderTurnstile);
    script.addEventListener("error", () => {
      showTurnstileError("No pudimos cargar la verificación de seguridad. Recarga la página e intenta nuevamente.");
    });
    document.head.append(script);
  }

  function showConfirmation(reference) {
    const overlay = document.createElement("div");
    overlay.className = "submission-overlay";
    overlay.innerHTML = `
      <div class="submission-dialog" role="dialog" aria-modal="true" aria-labelledby="submission-title" aria-describedby="submission-description">
        <div class="submission-dialog-icon" aria-hidden="true">${checkIcon}</div>
        <div class="submission-dialog-header">
          <span class="submission-dialog-kicker">Solicitud enviada</span>
          <h2 id="submission-title">Gracias. Tu requerimiento quedó registrado.</h2>
          <p id="submission-description">La solicitud fue enviada al equipo de AIJE para su revisión. Te contactaremos por el correo que proporcionaste.</p>
        </div>
        <div class="submission-reference" role="status"><span>Folio de recepción</span><strong></strong></div>
        <div class="submission-dialog-footer"><button type="button" class="submission-dialog-button">Entendido</button></div>
      </div>`;
    overlay.querySelector(".submission-reference strong").textContent = reference;
    const closeButton = overlay.querySelector(".submission-dialog-button");
    const close = () => {
      overlay.remove();
      document.body.classList.remove("modal-open");
      closeButton.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeyDown);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.append(overlay);
    document.body.classList.add("modal-open");
    closeButton.focus();
  }

  privacyButton?.addEventListener("click", () => setPrivacyAcknowledged(!privacyAcknowledged));
  form.addEventListener("input", clearFormError);

  fetch("/api/contact/config", { headers: { Accept: "application/json" } })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error("Contact configuration failed");
      if (data.turnstile?.enabled && data.turnstile.siteKey) {
        turnstileSiteKey = data.turnstile.siteKey;
        mountTurnstile();
      }
    })
    .catch(() => {
      showTurnstileError("No pudimos cargar la verificación de seguridad. Recarga la página e intenta nuevamente.");
    })
    .finally(() => {
      turnstileLoading = false;
      updateSubmitState();
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!privacyAcknowledged || submissionState === "submitting" || turnstileLoading || turnstileError || (turnstileSiteKey && !turnstileToken)) return;

    const formData = new FormData(form);
    const submissionId = crypto.randomUUID();
    submissionState = "submitting";
    clearFormError();
    form.setAttribute("aria-busy", "true");
    submitButton.innerHTML = "Enviando solicitud…";
    updateSubmitState();

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          company: formData.get("company"),
          email: formData.get("email"),
          requirement: formData.get("requirement"),
          website: formData.get("website"),
          privacyAcknowledgement: true,
          submissionId,
          turnstileToken,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "No pudimos enviar la solicitud. Intenta nuevamente.");

      form.reset();
      setPrivacyAcknowledged(false);
      resetTurnstile();
      submissionState = "success";
      showConfirmation(result?.reference || submissionId.replaceAll("-", "").slice(0, 8).toUpperCase());
    } catch (error) {
      resetTurnstile();
      showFormError(error instanceof Error ? error.message : "No pudimos enviar la solicitud. Intenta nuevamente.");
    } finally {
      form.setAttribute("aria-busy", "false");
      submitButton.innerHTML = `Enviar requerimiento${arrowIcon}`;
      updateSubmitState();
    }
  });

  setPrivacyAcknowledged(false);
})();

