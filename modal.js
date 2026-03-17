// ── MODAL PARTAGÉ ─────────────────────────────────────────────
// Partagé entre world-exploration.html et randomizer.html

function vimeoEmbed(url) {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1` : null;
}

// Galerie à colonnes variables, style Cargo
const GALLERY_PATTERN = [1, 2, 1, 1, 2]; // colonnes par rangée, en boucle

function buildVariedGallery(images) {
    if (!images || !images.length) return '';
    let html = '';
    let i = 0;
    let p = 0;
    while (i < images.length) {
        const cols = GALLERY_PATTERN[p % GALLERY_PATTERN.length];
        const group = images.slice(i, i + cols);
        html += `<div class="gallery-row cols-${group.length}">`;
        group.forEach((src, offset) => {
            html += `<img src="${src}" alt="" class="gallery-img" data-index="${i + offset}">`;
        });
        html += `</div>`;
        i += group.length;
        p++;
    }
    return html;
}

// ── LIGHTBOX ──────────────────────────────────────────────────
let _lightboxImages = [];
let _lightboxIndex  = 0;

function initLightbox() {
    if (document.getElementById('lightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = `
        <div id="lightbox-backdrop"></div>
        <button id="lightbox-close">×</button>
        <button id="lightbox-prev">‹</button>
        <button id="lightbox-next">›</button>
        <div id="lightbox-img-wrap">
            <img id="lightbox-img" src="" alt="">
        </div>
    `;
    document.body.appendChild(lb);

    document.getElementById('lightbox-backdrop').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev').addEventListener('click', () => lightboxNav(-1));
    document.getElementById('lightbox-next').addEventListener('click', () => lightboxNav(1));
    document.addEventListener('keydown', e => {
        if (!document.getElementById('lightbox').classList.contains('active')) return;
        if (e.key === 'Escape')      closeLightbox();
        if (e.key === 'ArrowLeft')   lightboxNav(-1);
        if (e.key === 'ArrowRight')  lightboxNav(1);
    });
}

function openLightbox(images, index) {
    initLightbox();
    _lightboxImages = images;
    _lightboxIndex  = index;
    lightboxShow();
    document.getElementById('lightbox').classList.add('active');
}

function lightboxShow() {
    const img  = document.getElementById('lightbox-img');
    const prev = document.getElementById('lightbox-prev');
    const next = document.getElementById('lightbox-next');
    img.src = _lightboxImages[_lightboxIndex];
    prev.style.display = _lightboxImages.length > 1 ? '' : 'none';
    next.style.display = _lightboxImages.length > 1 ? '' : 'none';
}

function lightboxNav(dir) {
    _lightboxIndex = (_lightboxIndex + dir + _lightboxImages.length) % _lightboxImages.length;
    lightboxShow();
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(data) {
    const modal        = document.getElementById('modal');
    const modalBody    = document.getElementById('modal-body');
    const modalGallery = document.getElementById('modal-gallery');
    const modalContent = modal.querySelector('.modal-content');

    const hasMedia = data.video || (data.gallery && data.gallery.length);
    modalContent.classList.toggle('has-gallery', !!hasMedia);

    if (hasMedia) {
        const videoBlock = data.video
            ? `<div class="modal-gallery-video">
                   <div class="modal-video-wrap">
                       <iframe src="${vimeoEmbed(data.video)}"
                               frameborder="0"
                               allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                               referrerpolicy="strict-origin-when-cross-origin"
                               allowfullscreen></iframe>
                   </div>
               </div>`
            : '';

        const imagesBlock = data.gallery && data.gallery.length
            ? buildVariedGallery(data.gallery)
            : '';

        modalGallery.innerHTML = `<div class="modal-gallery-varied">${videoBlock}${imagesBlock}</div>`;

        // Attacher le lightbox sur les images
        if (data.gallery && data.gallery.length) {
            modalGallery.querySelectorAll('.gallery-img').forEach(img => {
                img.addEventListener('click', e => {
                    const idx = parseInt(e.currentTarget.dataset.index, 10);
                    openLightbox(data.gallery, idx);
                });
            });
        }
    } else {
        modalGallery.innerHTML = '';
    }

    modalBody.innerHTML = `
        <h2>${data.title}</h2>
        <p class="modal-description">${data.description}</p>
        <div class="modal-body-content">
            ${data.content}
        </div>
    `;

    modal.classList.add('active');
}

function clearModal() {
    const modal = document.getElementById('modal');
    document.getElementById('modal-body').innerHTML = '';
    document.getElementById('modal-gallery').innerHTML = '';
    modal.classList.remove('active');
}
