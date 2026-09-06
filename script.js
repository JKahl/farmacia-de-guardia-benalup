(() => {
  const API_URL = "https://www.cofcadiz.es/wp-json/vcomm/v1/farmacias/guardia?estilo=completo";
  const SOURCE_URL = "https://www.cofcadiz.es/farmacias-de-guardia/";
  const FALLBACK_PHONE = "956211811";
  const FALLBACK_PHONE_DISPLAY = "956 21 18 11";
  const CACHE_KEY = "farmaciaGuardiaBenalup";
  const ZONE_MATCH = "BENALUP";

  const content = document.getElementById("content");
  const refreshBtn = document.getElementById("refresh-btn");

  function normalize(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase();
  }

  function formatDateEs(fechaStr) {
    if (!fechaStr) return "";
    const [y, m, d] = fechaStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const text = new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    return text;
  }

  function formatPhone(tel) {
    const digits = (tel || "").replace(/\D/g, "");
    return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  function buildMapsUrl(coordStr) {
    try {
      const [lat, lon] = JSON.parse(coordStr);
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    } catch (e) {
      return null;
    }
  }

  function findMatches(informacion) {
    return (informacion || []).filter((item) => {
      const zona = normalize(item.zona_guardia);
      const contacto = (item.contactos_profesionales || [])[0] || {};
      const municipio = normalize(contacto.municipio);
      return zona.includes(ZONE_MATCH) || municipio.includes(ZONE_MATCH);
    });
  }

  function cardHtml(item) {
    const contacto = (item.contactos_profesionales || [])[0] || {};
    const horarios = item.horarios && item.horarios.length ? item.horarios : [];
    const dutyBadges = horarios
      .map((h) => `<span class="duty-type">${h.tipo || ""}</span>`)
      .join(" ");
    const addressParts = [contacto.direccion, contacto.codigo_postal, contacto.municipio]
      .filter(Boolean)
      .join(", ");
    const phoneDigits = (contacto.telefono || "").replace(/\D/g, "");
    const mapsUrl = buildMapsUrl(contacto.coordenadas);

    return `
      <article class="card">
        <p class="date">${formatDateEs(item.fecha)}</p>
        <h2 class="pharmacy-name">${item.nombre || "Farmacia de guardia"}</h2>
        <div>${dutyBadges}</div>
        <p class="address">📍 ${addressParts}</p>
        <div class="actions">
          ${
            phoneDigits
              ? `<a class="phone-btn" href="tel:${phoneDigits}">📞 ${formatPhone(contacto.telefono)}</a>`
              : ""
          }
          ${
            mapsUrl
              ? `<a class="maps-link" href="${mapsUrl}" target="_blank" rel="noopener">Cómo llegar →</a>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderResult(matches, opts = {}) {
    const cards = matches.map(cardHtml).join("");
    const notice = opts.staleTimestamp
      ? `<p class="notice">Datos guardados a las ${new Date(opts.staleTimestamp).toLocaleTimeString(
          "es-ES",
          { hour: "2-digit", minute: "2-digit" }
        )} · no se pudo actualizar</p>`
      : "";
    content.innerHTML = cards + notice;
  }

  function renderError(message) {
    content.innerHTML = `
      <div class="state error">
        <div class="error-icon">⚠️</div>
        <p>${message}</p>
        <div class="actions" style="width:100%">
          <a class="phone-btn" href="tel:${FALLBACK_PHONE}">📞 Llamar al Colegio: ${FALLBACK_PHONE_DISPLAY}</a>
          <a class="maps-link" href="${SOURCE_URL}" target="_blank" rel="noopener">Ver página oficial →</a>
        </div>
      </div>
    `;
  }

  function renderLoading() {
    content.innerHTML = `
      <div class="state" id="state-loading">
        <div class="spinner" aria-hidden="true"></div>
        <p>Buscando la farmacia de guardia de hoy…</p>
      </div>
    `;
  }

  function saveCache(matches) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ matches, timestamp: Date.now() })
      );
    } catch (e) {
      /* ignore storage errors (private browsing, quota, etc.) */
    }
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function load() {
    renderLoading();
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const matches = findMatches(data.informacion);

      if (!matches.length) {
        throw new Error("NO_MATCH");
      }

      saveCache(matches);
      renderResult(matches);
    } catch (err) {
      const cached = loadCache();
      if (cached && cached.matches && cached.matches.length) {
        renderResult(cached.matches, { staleTimestamp: cached.timestamp });
      } else if (err && err.message === "NO_MATCH") {
        renderError(
          "No se ha encontrado información para Benalup-Casas Viejas en este momento."
        );
      } else {
        renderError(
          "No se ha podido conectar con el servicio de farmacias de guardia."
        );
      }
    }
  }

  refreshBtn.addEventListener("click", load);
  document.addEventListener("DOMContentLoaded", load);
  if (document.readyState !== "loading") load();
})();
