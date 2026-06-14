async function loadGallery(container) {
    try {
        if (!container) return; // nothing to do
        const response = await fetch('data/gallery.json');
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
        const raw = await response.json();
        // support either an array or Cloudinary-like object with a `resources` array
        const arquivos = Array.isArray(raw) ? raw : (raw && (raw.resources || raw.files || raw.items) ? (raw.resources || raw.files || raw.items) : []);

        container.innerHTML = '';
        const CLOUD_CHECK = /res\.cloudinary\.com\/.+\/image\/upload|res\.cloudinary\.com\/.+\/video\/upload/;

        const getThumbUrl = (item, width = 900) => {
            try {
                // Prefer using the original URL but insert a Cloudinary transformation
                const src = item.url || item.secure_url || item.secureUrl || item.src || '';
                if (!src) return '';
                if (!src.includes('/upload/')) return src;
                // don't double-insert if there's already a c_ transform present
                if (src.includes('/upload/c_') || src.match(/\/upload\/.+c_\w+/)) return src;
                return src.replace('/upload/', `/upload/c_limit,w_${width}/`);
            } catch (e) {
                return item.url || item.secure_url || '';
            }
        };

        const getContributor = (item) => {
            if (!item) return '';
            if (item.contributor) return item.contributor;
            if (item.context) {
                // Cloudinary Admin API sometimes returns context.custom
                if (item.context.custom && item.context.custom.contributor) return item.context.custom.contributor;
                if (item.context.contributor) return item.context.contributor;
            }
            return '';
        };

        arquivos.forEach(item => {
            const contributor = getContributor(item);
            // determine resource type with fallbacks
            const src = item.url || item.secure_url || item.secureUrl || item.src || '';
            const resourceType = item.resource_type || item.type || (/\.(mp4|webm|mov|ogg)$/i.test(src) ? 'video' : 'image');
            if (resourceType === 'image') {
                const wrapper = document.createElement('figure');
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.decoding = 'async';
                img.alt = item.public_id || '';
                img.src = getThumbUrl(item, 1200);
                wrapper.appendChild(img);
                if (contributor) {
                    const cap = document.createElement('figcaption');
                    cap.textContent = contributor;
                    cap.style.fontSize = '0.9rem';
                    cap.style.color = '#7d4960';
                    cap.style.paddingTop = '6px';
                    wrapper.appendChild(cap);
                }
                container.appendChild(wrapper);
            }

            if (resourceType === 'video') {
                const wrapper = document.createElement('figure');
                const video = document.createElement('video');
                video.controls = true;
                video.preload = 'metadata';
                video.style.maxHeight = '60vh';
                const src = document.createElement('source');
                src.src = item.url || item.secure_url || item.secureUrl || '';
                video.appendChild(src);

                // try to create a poster from Cloudinary if possible
                if (CLOUD_CHECK.test(src.src || src) && item.public_id && item.format) {
                    // build an image poster using Cloudinary image transforms
                    try {
                        const posterUrl = (item.url || item.secure_url || item.secureUrl || '').replace('/upload/', '/upload/c_fill,w_800,h_450/');
                        video.poster = posterUrl;
                    } catch (e) {
                        // ignore
                    }
                }

                wrapper.appendChild(video);
                if (contributor) {
                    const cap = document.createElement('figcaption');
                    cap.textContent = contributor;
                    cap.style.fontSize = '0.9rem';
                    cap.style.color = '#7d4960';
                    cap.style.paddingTop = '6px';
                    wrapper.appendChild(cap);
                }
                container.appendChild(wrapper);
            }
        });
    } catch (err) {
        console.error('Erro ao carregar gallery.json', err);
        if (container) container.innerHTML = `<p class="error">Falha ao carregar galeria: ${err.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const galleryEl = document.getElementById('gallery');
    if (galleryEl) loadGallery(galleryEl);

    const openBtn = document.getElementById('openGallery');
    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('galleryModal');
            const modalGallery = document.getElementById('modalGallery');
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            // load into modal
            loadGallery(modalGallery);
        });

        const close = document.getElementById('galleryClose');
        const backdrop = document.getElementById('galleryBackdrop');
        function closeModal() {
            const modal = document.getElementById('galleryModal');
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            const modalGallery = document.getElementById('modalGallery');
            if (modalGallery) modalGallery.innerHTML = '';
        }
        if (close) close.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') closeModal();
        });
    }
});