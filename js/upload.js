// Substitua `SEU_CLOUD_NAME` pelo seu `cloud name` do Cloudinary.
// Crie um `upload preset` unsigned chamado `casamento_nuno_vanda` no painel
// do Cloudinary e mantenha o nome abaixo.
const CLOUD_NAME = "duzytanjy";
const UPLOAD_PRESET = "casamento_nuno_vanda";
const ASSET_FOLDER = "casamento_nuno_vanda";

async function uploadFiles() {

    const files =
        document.getElementById("files").files;

    const status =
        document.getElementById("status");

    const nomeInput =
        document.getElementById("nome").value.trim();

    if (!files.length) {
        status.innerHTML = "Por favor, selecione ao menos uma foto ou vídeo.";
        return;
    }

    status.innerHTML = "A enviar...";

    const results = [];
    const errors = [];

    for (const file of files) {

        const formData = new FormData();

        formData.append("file", file);
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
        const list = results.map(r => `<li><a href="${r.url}" target="_blank" rel="noreferrer">${r.file}</a></li>`).join("");
        status.innerHTML = `Obrigado por partilhar ❤️<br><ul>${list}</ul>`;
    } else if (!errors.length) {
        status.innerHTML = "Nenhum ficheiro processado.";
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

    if (!fileInput || !fileInfo || !sendButton) return;

    sendButton.disabled = true;

    const allowedExtensions = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif",
        ".mp4", ".mov", ".m4v", ".avi", ".wmv", ".3gp", ".3g2", ".mkv", ".webm"
    ];

    const isAllowedFile = (file) => {
        const type = file.type.toLowerCase();
        if (type.startsWith("image/") || type.startsWith("video/")) {
            return true;
        }
        const name = file.name.toLowerCase();
        return allowedExtensions.some(ext => name.endsWith(ext));
    };

    fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files);
        const invalidFiles = files.filter(file => !isAllowedFile(file));
        const count = files.length;

        if (invalidFiles.length) {
            sendButton.disabled = true;
            fileInfo.textContent = "Formato inválido detectado. Selecione apenas fotos ou vídeos.";
            status.textContent = "Apenas formatos de imagem e vídeo são permitidos.";
            return;
        }

        status.textContent = "";
        sendButton.disabled = count === 0;
        fileInfo.textContent = count
            ? `${count} arquivo(s) selecionado(s)`
            : "Nenhum arquivo selecionado";
    });
});