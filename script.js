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

// Inicializar scripts al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();

    // Ejecutar reveal inmediatamente por si hay elementos en el viewport
    reveal();

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
