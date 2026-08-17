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
        // Attach the file with a new filename so uploads keep the desired name
        formData.append("file", file, newFileName);
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