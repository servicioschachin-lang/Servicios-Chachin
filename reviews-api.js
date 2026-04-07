/**
 * Reseñas vía Netlify Function. Si cambias de hosting, define antes:
 * window.REVIEWS_FUNCTION_URL = 'https://tu-sitio.netlify.app/.netlify/functions/reviews';
 */
(function () {
  function reviewsUrl() {
    if (
      typeof window.REVIEWS_FUNCTION_URL === "string" &&
      window.REVIEWS_FUNCTION_URL.length > 0
    ) {
      return window.REVIEWS_FUNCTION_URL;
    }
    return "/.netlify/functions/reviews";
  }

  function reviewStars(rating) {
    var n = Math.round(Number(rating));
    if (n < 0) n = 0;
    if (n > 5) n = 5;
    var full = "★";
    var empty = "☆";
    return full.repeat(n) + empty.repeat(5 - n);
  }

  function buildReviewCard(r) {
    var card = document.createElement("article");
    card.className = "review-card";

    var header = document.createElement("div");
    header.className = "review-card-header";

    var authorWrap = document.createElement("span");
    authorWrap.className = "review-author";
    if (r.authorUri) {
      var a = document.createElement("a");
      a.href = r.authorUri;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = r.author || "Google user";
      authorWrap.appendChild(a);
    } else {
      authorWrap.textContent = r.author || "Usuario de Google";
    }
    header.appendChild(authorWrap);

    if (r.rating != null) {
      var stars = document.createElement("span");
      stars.className = "review-stars";
      stars.setAttribute("aria-label", String(r.rating) + " de 5");
      stars.textContent = reviewStars(r.rating);
      header.appendChild(stars);
    }

    card.appendChild(header);

    if (r.relativeTime || r.publishTime) {
      var meta = document.createElement("p");
      meta.className = "review-meta";
      meta.textContent = r.relativeTime || r.publishTime || "";
      card.appendChild(meta);
    }

    var body = document.createElement("p");
    body.className = "review-body";
    body.textContent = r.text || "";
    card.appendChild(body);

    return card;
  }

  function loadGoogleReviews() {
    var root = document.getElementById("google-reviews-root");
    var statusEl = document.getElementById("google-reviews-status");
    var mapsLink = document.getElementById("google-reviews-maps-link");
    var attrEl = document.getElementById("google-reviews-attribution");
    var summaryEl = document.getElementById("google-reviews-summary");
    if (!root || !statusEl) return;

    var url = reviewsUrl();
    statusEl.textContent = "Cargando reseñas…";
    root.innerHTML = "";
    if (summaryEl) {
      summaryEl.hidden = true;
      summaryEl.textContent = "";
    }
    if (mapsLink) {
      mapsLink.hidden = true;
      mapsLink.href = "#";
    }
    if (attrEl) attrEl.textContent = "";

    fetch(url)
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (parseErr) {
            return { badJson: true, status: res.status, snippet: (text || "").slice(0, 80) };
          }
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (_ref) {
        if (_ref.badJson) {
          var st = _ref.status;
          var looksHtml =
            _ref.snippet && /^\s*</.test(_ref.snippet);
          if (st === 404) {
            statusEl.textContent =
              "404: no existe la función en el servidor. Sube netlify.toml + carpeta netlify/functions/reviews.js en el mismo despliegue, o en Netlify → Functions comprueba que aparezca «reviews».";
          } else if (looksHtml && (st === 200 || st === 304)) {
            statusEl.textContent =
              "El servidor devolvió una página HTML en lugar de datos. Muy probable: en Netlify (Domain settings → Rewrites/Redirects) tienes una regla tipo «/* → /index.html». Elimínala para sitios con varias .html o excluye /.netlify/functions/*. Prueba abrir en el navegador: " +
              window.location.origin +
              "/.netlify/functions/reviews — debe verse JSON, no tu web.";
          } else {
            statusEl.textContent =
              "Respuesta no válida (código " +
              st +
              "). Abre la consola de Netlify (Functions → reviews → logs) y revisa variables GOOGLE_MAPS_API_KEY y GOOGLE_PLACE_ID.";
          }
          return;
        }

        var ok = _ref.ok;
        var data = _ref.data;
        statusEl.textContent = "";

        if (data && data.error === "missing_config") {
          statusEl.textContent =
            "Faltan variables en Netlify: GOOGLE_MAPS_API_KEY y GOOGLE_PLACE_ID (Site settings → Environment variables). Luego pulsa «Trigger deploy».";
          return;
        }

        if (!ok || !data) {
          statusEl.textContent =
            "Error al cargar reseñas. Revisa clave API, Place ID y Places API (New) en Google Cloud. " +
            (data && data.detail ? String(data.detail).slice(0, 160) : "HTTP " + (_ref.status || ""));
          return;
        }

        if (data.attribution && attrEl) {
          attrEl.textContent = data.attribution;
        }

        if (data.googleMapsUri && mapsLink) {
          mapsLink.href = data.googleMapsUri;
          mapsLink.hidden = false;
        }

        if (
          summaryEl &&
          data.placeRating != null &&
          !isNaN(Number(data.placeRating))
        ) {
          summaryEl.hidden = false;
          var line =
            "Valoración en Google Maps: " +
            Number(data.placeRating).toFixed(1) +
            " / 5";
          if (data.displayName) {
            line += " · " + data.displayName;
          }
          summaryEl.textContent = line;
        }

        var reviews = data.reviews;
        if (!reviews || !reviews.length) {
          statusEl.textContent =
            "La API no devolvió reseñas (máx. 5 en Google). Comprueba facturación/SKU y que el negocio tenga reseñas públicas.";
          return;
        }

        var frag = document.createDocumentFragment();
        for (var i = 0; i < reviews.length; i++) {
          frag.appendChild(buildReviewCard(reviews[i]));
        }
        root.appendChild(frag);
        if (typeof reveal === "function") reveal();
      })
      .catch(function () {
        statusEl.textContent =
          "Sin conexión o bloqueo del navegador al llamar: " +
          url +
          ". Prueba otro Wi‑Fi o desactiva bloqueadores.";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGoogleReviews);
  } else {
    loadGoogleReviews();
  }
})();
