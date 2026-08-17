// Substitua `SEU_CLOUD_NAME` pelo seu `cloud name` do Cloudinary.
// Crie um `upload preset` unsigned chamado `casamento_nuno_vanda` no painel
// do Cloudinary e mantenha o nome abaixo.
const CLOUD_NAME = "duzytanjy";
const UPLOAD_PRESET = "casamento_nuno_vanda";
const ASSET_FOLDER = "casamento_nuno_vanda";

function pad(value) {
    return String(value).padStart(2, "0");
}

function formatUploadTimestamp(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function sanitizeUserName(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
}

// Obtém a resolução (largura/altura) de um File de vídeo usando object URL
function getVideoResolution(file) {
    return new Promise((resolve, reject) => {
        try {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = url;
            const clean = () => {
                try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
            };
            video.addEventListener('loadedmetadata', () => {
                const width = video.videoWidth;
                const height = video.videoHeight;
                clean();
                if (Number.isFinite(width) && Number.isFinite(height)) resolve({ width, height });
                else reject(new Error('Resolução inválida'));
            });
            video.addEventListener('error', (e) => {
                clean();
                reject(new Error('Erro ao carregar metadata do vídeo'));
            });
        } catch (err) {
            reject(err);
        }
    });
}

// Converte um ficheiro de vídeo para Full HD (1920x1080) no browser usando canvas + MediaRecorder.
// Retorna um File contendo o vídeo convertido (tipicamente webm). Se o navegador não suportar MediaRecorder ou ocorrer erro,
// resolve para o ficheiro original como fallback.
async function convertVideoTo1080(file) {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
        console.warn('Conversão no cliente indisponível: MediaRecorder ou captureStream não suportado. Enviando original.');
        return file;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    try {
        await video.play().catch(() => { /* play pode falhar sem gesture, prosseguir */ });
    } catch (e) {
        // ignore
    }

    await new Promise((resolve, reject) => {
        if (video.readyState >= 1 && Number.isFinite(video.duration)) return resolve();
        const onLoaded = () => { cleanupListeners(); resolve(); };
        const onError = () => { cleanupListeners(); reject(new Error('Erro ao carregar vídeo para conversão')); };
        function cleanupListeners() {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('error', onError);
        }
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onError);
    }).catch(err => {
        URL.revokeObjectURL(url);
        console.error('Erro ao preparar vídeo para conversão:', err);
        return file; // fallback
    });

    const targetW = 1920;
    const targetH = 1080;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // desenhar frames enquanto o vídeo reproduz
    let rafId = null;
    function drawFrame() {
        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            // pode falhar se o vídeo não estiver disponível por qualquer razão
        }
        rafId = requestAnimationFrame(drawFrame);
    }
    drawFrame();

    // Captura da canvas (vídeo) e adiciona as faixas de áudio originais do vídeo
    const fps = 30;
    const canvasStream = canvas.captureStream(fps);
    const videoStream = video.captureStream ? video.captureStream() : null;
    if (videoStream) {
        const audioTracks = videoStream.getAudioTracks();
        audioTracks.forEach(t => canvasStream.addTrack(t));
    }

    // escolher mimeType suportado
    const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm'
    ];
    let mimeType = '';
    for (const c of candidates) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
    }
    if (!mimeType) mimeType = '';

    let recorder;
    try {
        recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);
    } catch (err) {
        console.error('MediaRecorder falhou ao iniciar:', err);
        cancelAnimationFrame(rafId);
        URL.revokeObjectURL(url);
        return file;
    }

    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    const stopPromise = new Promise((resolve) => {
        recorder.onstop = () => resolve();
    });

    try {
        recorder.start(1000); // timeslice
    } catch (err) {
        console.error('Falha ao iniciar MediaRecorder:', err);
        cancelAnimationFrame(rafId);
        URL.revokeObjectURL(url);
        return file;
    }

    // parar quando o vídeo terminar, ou após duração+1s
    const durationMs = (Number.isFinite(video.duration) ? (video.duration * 1000) : 0);
    const fallbackTimeout = setTimeout(() => {
        try { if (recorder.state === 'recording') recorder.stop(); } catch (e) {}
    }, durationMs ? durationMs + 1500 : 60000); // se duração desconhecida, timeout 60s

    // garantir que o vídeo está a reproduzir até ao fim
    try {
        if (video.paused) await video.play().catch(() => {});
    } catch (e) { /* ignore */ }

    // quando 'ended' ocorrer, parar o recorder
    const onEnded = () => {
        try { if (recorder && recorder.state === 'recording') recorder.stop(); } catch (e) {}
    };
    video.addEventListener('ended', onEnded);

    await stopPromise;
    clearTimeout(fallbackTimeout);

    // limpar
    cancelAnimationFrame(rafId);
    video.removeEventListener('ended', onEnded);
    try { video.pause(); } catch (e) {}
    URL.revokeObjectURL(url);

    if (!chunks.length) {
        console.warn('Conversão gerou 0 chunks, enviando original');
        return file;
    }

    const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
    const newName = file.name.replace(/(\.[^.]+)?$/, '.webm');
    const convertedFile = new File([blob], newName, { type: blob.type });
    return convertedFile;
}

async function uploadFiles() {

    const files =
        document.getElementById("files").files;

    const status =
        document.getElementById("status");

    const nomeInput =
        document.getElementById("nome").value.trim();
    const sanitizedNome = sanitizeUserName(nomeInput) || "null";
    const timestamp = formatUploadTimestamp(new Date());

    if (!files.length) {
        status.innerHTML = "Por favor, selecione ao menos uma foto ou vídeo.";
        return;
    }

    status.innerHTML = "A enviar...";

    const results = [];
    const errors = [];

    for (const [index, file] of Array.from(files).entries()) {

        const formData = new FormData();

        const baseName = sanitizedNome || "null";
        const fileStamp = `${timestamp}_${pad(index + 1)}`;
        const extMatch = file.name.match(/(\.[^.]*)$/);
        const ext = extMatch ? extMatch[1] : '';
        const newFileName = `${baseName}_${fileStamp}${ext}`;
        const publicId = `${baseName}_${fileStamp}`;
        formData.append("public_id", publicId);

        // Se for vídeo e 4K, tentar converter para 1080p antes do upload
        let uploadFile = file;
        if ((file.type || '').toLowerCase().startsWith('video/')) {
            try {
                const res = await getVideoResolution(file);
                if (res.width >= 3840 || res.height >= 2160) {
                    // informar o utilizador e converter
                    status.textContent = `Convertendo ${file.name} para 1080p para reduzir tamanho...`;
                    const converted = await convertVideoTo1080(file);
                    if (converted && converted !== file) {
                        uploadFile = converted;
                        const convExtMatch = uploadFile.name.match(/(\.[^.]*)$/);
                        const convExt = convExtMatch ? convExtMatch[1] : '';
                        const finalName = `${baseName}_${fileStamp}${convExt}`;
                        formData.append("file", uploadFile, finalName);
                    } else {
                        // fallback: usar original
                        formData.append("file", uploadFile, newFileName);
                    }
                    status.textContent = 'A enviar...';
                } else {
                    formData.append("file", uploadFile, newFileName);
                }
            } catch (err) {
                console.warn('Não foi possível verificar/convertir resolução:', err);
                formData.append("file", uploadFile, newFileName);
            }
        } else {
            // imagem ou outro ficheiro
            formData.append("file", uploadFile, newFileName);
        }

        formData.append(
            "upload_preset",
            UPLOAD_PRESET
        );

        // Guardar o nome como context no Cloudinary
        if (nomeInput) {
            formData.append("context", `contributor=${nomeInput}`);
        }

        // Enviar para a pasta do preset (opcional - preset também pode definir folder)
        if (ASSET_FOLDER) {
            formData.append("folder", ASSET_FOLDER);
        }

        try {
            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!res.ok) {
                const text = await res.text();
                console.error("Cloudinary upload failed:", res.status, text);
                console.error("File:", file.name, "Size:", file.size, "Type:", file.type);
                errors.push({ file: file.name, status: res.status, message: text });
                continue; // continuar com os próximos ficheiros
            }

            const body = await res.json();
            console.log("Uploaded:", body);
            results.push({ file: file.name, url: body.secure_url, public_id: body.public_id });
        } catch (err) {
            console.error("Upload exception:", err);
            errors.push({ file: file.name, message: err.message || String(err) });
            continue;
        }
    }

    // Mostrar resumo ao utilizador
    if (results.length) {
        status.textContent = "Obrigado por partilhar ❤️";
    } else if (!errors.length) {
        status.textContent = "Nenhum ficheiro processado.";
    }

    if (errors.length) {
        const errList = errors.map(e => `<li>${e.file}: ${e.status ? e.status + ' - ' : ''}${e.message}</li>`).join("");
        status.innerHTML += `<br><strong>Erros:</strong><ul>${errList}</ul>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("files");
    const fileInfo = document.getElementById("fileInfo");
    const sendButton = document.getElementById("btnEnviar");
    const status = document.getElementById("status");

    const fileButton = document.querySelector("label[for='files']");

    if (!fileInput || !fileInfo || !sendButton || !status || !fileButton) return;

    fileButton.addEventListener("click", (event) => {
        event.preventDefault();
        fileInput.click();
    });

    sendButton.disabled = true;

    const allowedExtensions = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif",
        ".mp4", ".mov", ".m4v", ".avi", ".wmv", ".3gp", ".3g2", ".mkv", ".webm"
    ];

    const isAllowedFile = (file) => {
        const type = (file.type || '').toLowerCase();
        if (type.startsWith("image/") || type.startsWith("video/")) {
            return true;
        }
        const name = (file.name || '').toLowerCase();
        return allowedExtensions.some(ext => name.endsWith(ext));
    };

    // Obtém a duração (em segundos) de um File de vídeo usando object URL
    function getVideoDuration(file) {
        return new Promise((resolve, reject) => {
            try {
                const url = URL.createObjectURL(file);
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.src = url;
                const clean = () => {
                    try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
                };
                video.addEventListener('loadedmetadata', () => {
                    const duration = video.duration;
                    clean();
                    // duration pode ser NaN em arquivos inválidos
                    if (Number.isFinite(duration)) resolve(duration);
                    else reject(new Error('Duração inválida'));
                });
                video.addEventListener('error', (e) => {
                    clean();
                    reject(new Error('Erro ao carregar metadata do vídeo'));
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '–';
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    fileInput.addEventListener("change", async () => {
        const files = Array.from(fileInput.files);
        const invalidFiles = files.filter(file => !isAllowedFile(file));
        const count = files.length;

        if (invalidFiles.length) {
            sendButton.disabled = true;
            fileInfo.textContent = "Formato inválido detectado. Selecione apenas fotos ou vídeos.";
            status.textContent = "Apenas formatos de imagem e vídeo são permitidos.";
            return;
        }

        const videoFiles = files.filter(f => (f.type || '').toLowerCase().startsWith('video/'));
        if (videoFiles.length === 0) {
            // nenhum vídeo — comportamento padrão
            status.textContent = "";
            sendButton.disabled = count === 0;
            fileInfo.textContent = count
                ? `${count} arquivo(s) selecionado(s)`
                : "Nenhum arquivo selecionado";
            return;
        }

        // Validar duração dos vídeos (máx. 120 segundos = 2 minutos)
        const MAX_SECONDS = 120;
        status.textContent = 'A validar duração dos vídeos...';
        sendButton.disabled = true;

        try {
            const durations = await Promise.all(videoFiles.map(f => getVideoDuration(f)));
            const tooLongIndex = durations.findIndex(d => d > MAX_SECONDS);
            if (tooLongIndex !== -1) {
                const vf = videoFiles[tooLongIndex];
                const dur = durations[tooLongIndex];
                fileInfo.textContent = `O vídeo "${vf.name}" tem ${formatDuration(dur)} (limite ${formatDuration(MAX_SECONDS)}). Seleccione um vídeo com até 2 minutos.`;
                status.textContent = "Vídeo demasiado longo (> 2 minutos).";
                sendButton.disabled = true;
                return;
            }

            // todos os vídeos estão dentro do limite
            status.textContent = "";
            sendButton.disabled = count === 0;
            fileInfo.textContent = count
                ? `${count} arquivo(s) selecionado(s)`
                : "Nenhum arquivo selecionado";
        } catch (err) {
            console.error('Erro ao validar duração dos vídeos:', err);
            status.textContent = 'Erro ao validar vídeos. Tente novamente.';
            sendButton.disabled = true;
        }
    });
});