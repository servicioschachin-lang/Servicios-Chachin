// Animación de aparición (Reveal) al hacer scroll
function reveal() {
    var reveals = document.querySelectorAll(".reveal");
  
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 100;

        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}
  
window.addEventListener("scroll", reveal);

// Inicializar scripts al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    // Ejecutar reveal inmediatamente por si hay elementos en el viewport
    reveal();

    loadGoogleReviews();

    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // Si el href es solo '#' no hacemos nada (ignorar botones vacíos)
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

function reviewStars(rating) {
    var n = Math.round(Number(rating));
    if (n < 0) n = 0;
    if (n > 5) n = 5;
    var full = "★";
    var empty = "☆";
    return full.repeat(n) + empty.repeat(5 - n);
}

function loadGoogleReviews() {
    var root = document.getElementById("google-reviews-root");
    var statusEl = document.getElementById("google-reviews-status");
    var mapsLink = document.getElementById("google-reviews-maps-link");
    var attrEl = document.getElementById("google-reviews-attribution");
    var summaryEl = document.getElementById("google-reviews-summary");
    if (!root || !statusEl) return;

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

    fetch("/.netlify/functions/reviews")
        .then(function (res) {
            return res.text().then(function (text) {
                var data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (parseErr) {
                    return {
                        ok: false,
                        badJson: true,
                        status: res.status,
                        data: null,
                    };
                }
                return { ok: res.ok, status: res.status, data: data };
            });
        })
        .then(function (_ref) {
            if (_ref.badJson) {
                statusEl.textContent = "";
                if (_ref.status === 404) {
                    statusEl.textContent =
                        "No está disponible la función de reseñas: sube a Netlify la carpeta completa del sitio (archivo netlify.toml y carpeta netlify/functions/reviews.js), o conecta el repositorio Git con esos archivos. Solo subir el HTML no activa las funciones.";
                } else {
                    statusEl.textContent =
                        "El servidor devolvió una respuesta que no es JSON (código " +
                        _ref.status +
                        "). Revisa el despliegue en Netlify y que exista la función «reviews».";
                }
                return;
            }

            var ok = _ref.ok;
            var data = _ref.data;
            statusEl.textContent = "";

            if (data && data.error === "missing_config") {
                statusEl.textContent =
                    "Las reseñas de Google se mostrarán aquí cuando en Netlify (Site settings → Environment variables) configures GOOGLE_MAPS_API_KEY y GOOGLE_PLACE_ID, y luego vuelvas a desplegar.";
                return;
            }

            if (!ok || !data) {
                statusEl.textContent =
                    "No se pudieron cargar las reseñas. Revisa la clave API, el Place ID y la facturación de Google Cloud (Places API activada). Detalle: " +
                    (data && data.detail ? String(data.detail).slice(0, 120) : "error " + (_ref.status || ""));
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
                    "No hay reseñas para mostrar aún, o tu plan de Google no devuelve el campo de reseñas.";
                return;
            }

            var frag = document.createDocumentFragment();
            for (var i = 0; i < reviews.length; i++) {
                frag.appendChild(buildReviewCard(reviews[i]));
            }
            root.appendChild(frag);
            reveal();
        })
        .catch(function () {
            statusEl.textContent =
                "Error de red al pedir las reseñas. Si abres la web desde un archivo en tu PC, usa el sitio publicado en Netlify. Si ya está en Netlify, comprueba que la URL sea https y que no bloquee el navegador.";
        });
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

// Lógica para los carruseles de imágenes
document.querySelectorAll('.solution-img').forEach(container => {
    const scrollArea = container.querySelector('.carousel-container');
    const prevBtn = container.querySelector('.prev');
    const nextBtn = container.querySelector('.next');
    
    if(prevBtn && nextBtn && scrollArea) {
        prevBtn.addEventListener('click', () => {
            scrollArea.scrollBy({ left: -scrollArea.clientWidth, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            scrollArea.scrollBy({ left: scrollArea.clientWidth, behavior: 'smooth' });
        });
    }
});

// Lógica para el Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');

let currentGallery = [];
let currentIndex = 0;

if(lightbox) {
    document.querySelectorAll('.carousel-container').forEach(container => {
        const images = Array.from(container.querySelectorAll('img.bg-img'));
        
        images.forEach((img, index) => {
            img.addEventListener('click', () => {
                currentGallery = images.map(i => i.src);
                currentIndex = index;
                updateLightbox();
                lightbox.classList.add('active');
            });
        });
    });

    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    lightbox.addEventListener('click', (e) => {
        if(e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    lightboxPrev.addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : currentGallery.length - 1;
        updateLightbox();
    });

    lightboxNext.addEventListener('click', () => {
        currentIndex = (currentIndex < currentGallery.length - 1) ? currentIndex + 1 : 0;
        updateLightbox();
    });

    function updateLightbox() {
        lightboxImg.src = currentGallery[currentIndex];
    }
}

// Efecto Spotlight para tarjetas (Premium Vercel UI effect)
document.querySelectorAll('.services-grid, .solutions-grid').forEach(grid => {
  grid.onmousemove = e => {
    for(const card of grid.children) {
      const rect = card.getBoundingClientRect(),
            x = e.clientX - rect.left,
            y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };
  };
});
