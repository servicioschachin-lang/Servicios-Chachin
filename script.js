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

function initMobileNav() {
    var nav = document.querySelector(".floating-nav.floating-nav--site");
    var toggle = document.querySelector(".nav-toggle");
    if (!nav || !toggle) return;

    function setOpen(open) {
        nav.classList.toggle("is-menu-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.classList.toggle("is-open", open);
        document.body.classList.toggle("nav-open", open);
    }

    toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(!nav.classList.contains("is-menu-open"));
    });

    nav.querySelectorAll(".nav-panel a").forEach(function (link) {
        link.addEventListener("click", function () {
            setOpen(false);
        });
    });

    var btnNav = nav.querySelector(".btn-nav");
    if (btnNav) {
        btnNav.addEventListener("click", function () {
            setOpen(false);
        });
    }

    window.addEventListener("resize", function () {
        if (window.innerWidth > 960) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", function (e) {
        if (!nav.classList.contains("is-menu-open")) return;
        if (!nav.contains(e.target)) setOpen(false);
    });
}

/** Fondo: red de partículas con enlaces por distancia + respuesta al puntero (sin bloquear clics). */
function initPageNetworkCanvas() {
    var wrap = document.querySelector(".page-network");
    var canvas = wrap && wrap.querySelector(".page-network-canvas");
    if (!canvas || !wrap) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var W = 0;
    var H = 0;
    var dpr = 1;
    var nodes = [];
    var mouse = { x: 0, y: 0, on: false };
    var rafId = 0;
    var running = false;
    var resizeTimer = null;
    var loopT0 = 0;
    var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* Red densa: enlace “fuerte” + halo de conexión débil (más capas visuales) */
    var LINK_STRONG = 128;
    var LINK_STRONG_SQ = LINK_STRONG * LINK_STRONG;
    var LINK_WEAK = 176;
    var LINK_WEAK_SQ = LINK_WEAK * LINK_WEAK;
    var MOUSE_R = 200;
    var MOUSE_SQ = MOUSE_R * MOUSE_R;

    function prefersReduced() {
        return mqReduce.matches;
    }

    function nodeCap() {
        return W < 480 ? 78 : 136;
    }

    function countNodes() {
        var area = W * H;
        var n = Math.round(Math.sqrt(area) / 18.5);
        var cap = nodeCap();
        return Math.max(44, Math.min(cap, n));
    }

    function seedNodes() {
        var n = countNodes();
        nodes = [];
        for (var i = 0; i < n; i++) {
            nodes.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.48,
                vy: (Math.random() - 0.5) * 0.48,
                br: Math.random() * 1.05 + 1.05,
            });
        }
    }

    function resize() {
        var rect = wrap.getBoundingClientRect();
        W = Math.max(1, rect.width);
        H = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seedNodes();
    }

    function scheduleResize() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resizeTimer = null;
            resize();
            if (prefersReduced()) {
                stopLoop();
                draw(0, true);
            }
        }, 110);
    }

    function localPoint(clientX, clientY) {
        var rect = wrap.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onMouseMove(e) {
        var p = localPoint(e.clientX, e.clientY);
        mouse.x = p.x;
        mouse.y = p.y;
        mouse.on = true;
    }

    function onTouch(e) {
        if (!e.touches || !e.touches.length) return;
        var p = localPoint(e.touches[0].clientX, e.touches[0].clientY);
        mouse.x = p.x;
        mouse.y = p.y;
        mouse.on = true;
    }

    function clearPointer() {
        mouse.on = false;
    }

    function step() {
        var n = nodes.length;
        var i, nd, sp, maxSp, j, a, mdx, mdy, d2, d, pull, mx, my;

        for (i = 0; i < n; i++) {
            nd = nodes[i];
            nd.x += nd.vx;
            nd.y += nd.vy;
            nd.vx += (Math.random() - 0.5) * 0.017;
            nd.vy += (Math.random() - 0.5) * 0.017;
            sp = Math.sqrt(nd.vx * nd.vx + nd.vy * nd.vy);
            maxSp = 0.52;
            if (sp > maxSp) {
                nd.vx = (nd.vx / sp) * maxSp;
                nd.vy = (nd.vy / sp) * maxSp;
            }
            if (nd.x < 0) {
                nd.x = 0;
                nd.vx *= -1;
            } else if (nd.x > W) {
                nd.x = W;
                nd.vx *= -1;
            }
            if (nd.y < 0) {
                nd.y = 0;
                nd.vy *= -1;
            } else if (nd.y > H) {
                nd.y = H;
                nd.vy *= -1;
            }
        }

        if (!mouse.on) return;
        mx = mouse.x;
        my = mouse.y;
        for (j = 0; j < n; j++) {
            a = nodes[j];
            mdx = a.x - mx;
            mdy = a.y - my;
            d2 = mdx * mdx + mdy * mdy;
                if (d2 < MOUSE_SQ && d2 > 0.4) {
                d = Math.sqrt(d2);
                pull = ((MOUSE_R - d) / MOUSE_R) * 0.076;
                a.vx += (mdx / d) * pull;
                a.vy += (mdy / d) * pull;
            }
        }
    }

    function draw(t, isStatic) {
        ctx.clearRect(0, 0, W, H);
        var n = nodes.length;
        var i, j, a, b, dx, dy, d2, d, alpha, midx, midy, mdx, mdy, glow, r, tScale;

        for (i = 0; i < n; i++) {
            for (j = i + 1; j < n; j++) {
                a = nodes[i];
                b = nodes[j];
                dx = a.x - b.x;
                dy = a.y - b.y;
                d2 = dx * dx + dy * dy;
                if (d2 < LINK_WEAK_SQ && d2 > 1) {
                    d = Math.sqrt(d2);
                    var strong = d2 < LINK_STRONG_SQ;
                    if (strong) {
                        alpha = (1 - d / LINK_STRONG) * 0.31;
                        ctx.lineWidth = 1.28;
                    } else {
                        alpha = (1 - d / LINK_WEAK) * 0.1;
                        ctx.lineWidth = 0.92;
                    }
                    if (mouse.on) {
                        midx = (a.x + b.x) * 0.5;
                        midy = (a.y + b.y) * 0.5;
                        mdx = midx - mouse.x;
                        mdy = midy - mouse.y;
                        glow = 1 - Math.min(1, (mdx * mdx + mdy * mdy) / (236 * 236));
                        alpha += glow * (strong ? 0.42 : 0.14);
                    }
                    ctx.strokeStyle = "rgba(240,240,242," + Math.min(0.86, alpha) + ")";
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        tScale = t * 0.0017;
        for (i = 0; i < n; i++) {
            a = nodes[i];
            r = a.br;
            alpha = 0.5;
            if (mouse.on) {
                mdx = a.x - mouse.x;
                mdy = a.y - mouse.y;
                d2 = mdx * mdx + mdy * mdy;
                if (d2 < MOUSE_SQ) {
                    d = Math.sqrt(d2);
                    var falloff = 1 - d / MOUSE_R;
                    r += falloff * 2;
                    alpha = 0.48 + falloff * 0.46;
                }
            }
            if (!isStatic) {
                r += Math.sin(tScale + a.x * 0.0088 + i * 0.37) * 0.3;
            }
            ctx.beginPath();
            ctx.fillStyle = "rgba(248,248,249," + alpha + ")";
            ctx.arc(a.x, a.y, Math.max(0.65, r), 0, Math.PI * 2);
            ctx.fill();
            if (i % 5 === 0) {
                ctx.strokeStyle = "rgba(110, 110, 115, " + (alpha * 0.42) + ")";
                ctx.lineWidth = 1.15;
                ctx.beginPath();
                ctx.arc(a.x, a.y, r + 1.25, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    function loop(ts) {
        if (!running) return;
        if (!loopT0) loopT0 = ts;
        var elapsed = ts - loopT0;
        if (!prefersReduced()) step();
        draw(elapsed, prefersReduced());
        rafId = window.requestAnimationFrame(loop);
    }

    function startLoop() {
        if (prefersReduced()) {
            draw(0, true);
            return;
        }
        if (running) return;
        running = true;
        loopT0 = 0;
        rafId = window.requestAnimationFrame(loop);
    }

    function stopLoop() {
        running = false;
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
        loopT0 = 0;
    }

    function onVisibility() {
        if (document.hidden) {
            stopLoop();
        } else if (prefersReduced()) {
            draw(0, true);
        } else {
            startLoop();
        }
    }

    function onReduceChange() {
        stopLoop();
        seedNodes();
        if (prefersReduced()) {
            draw(0, true);
        } else if (document.visibilityState === "visible") {
            startLoop();
        }
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", clearPointer, { passive: true });
    window.addEventListener("touchcancel", clearPointer, { passive: true });
    document.documentElement.addEventListener("mouseleave", clearPointer);

    window.addEventListener("resize", scheduleResize);
    if (mqReduce.addEventListener) {
        mqReduce.addEventListener("change", onReduceChange);
    } else if (mqReduce.addListener) {
        mqReduce.addListener(onReduceChange);
    }
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (prefersReduced()) {
        draw(0, true);
    } else if (document.visibilityState === "visible") {
        startLoop();
    }
}

function initScrollTopButton() {
    var btn = document.getElementById("scroll-top");
    if (!btn) return;

    var threshold = 420;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        btn.classList.toggle("is-visible", y > threshold);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", function () {
        var smooth = !reduceMotion.matches;
        window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
        try {
            btn.blur();
        } catch (e) {
            /* ignore */
        }
    });
}

// Inicializar scripts al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();
    initPageNetworkCanvas();
    initScrollTopButton();

    // Ejecutar reveal inmediatamente por si hay elementos en el viewport
    reveal();

    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            // Si el href es solo '#' no hacemos nada (ignorar botones vacíos)
            if (targetId === '#') return;

            // “Ir al contenido”: foco en <main> para lectores de pantalla y teclado
            if (this.classList.contains('skip-link')) {
                e.preventDefault();
                const mainEl = document.querySelector(targetId);
                if (mainEl) {
                    mainEl.scrollIntoView({ behavior: 'smooth' });
                    mainEl.focus({ preventScroll: true });
                }
                return;
            }

            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

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

if (lightbox) {
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

    if (lightboxClose) {
        lightboxClose.addEventListener('click', () => {
            lightbox.classList.remove('active');
        });
    }

    lightbox.addEventListener('click', (e) => {
        if(e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', () => {
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : currentGallery.length - 1;
            updateLightbox();
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener('click', () => {
            currentIndex = (currentIndex < currentGallery.length - 1) ? currentIndex + 1 : 0;
            updateLightbox();
        });
    }

    function updateLightbox() {
        if (lightboxImg && currentGallery[currentIndex]) {
            lightboxImg.src = currentGallery[currentIndex];
        }
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
