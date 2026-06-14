// Substitua `SEU_CLOUD_NAME` pelo seu `cloud name` do Cloudinary.
// Crie um `upload preset` unsigned chamado `casamento_nuno_vanda` no painel
// do Cloudinary e mantenha o nome abaixo.
const CLOUD_NAME = "duzytanjy";
const UPLOAD_PRESET = "casamento_nuno_vanda";

async function uploadFiles() {

    const files =
        document.getElementById("files").files;

    const status =
        document.getElementById("status");

    if (!files.length) {
        status.innerHTML = "Por favor, selecione ao menos uma foto ou vídeo.";
        return;
    }

    status.innerHTML = "A enviar...";

    for (const file of files) {

        const formData = new FormData();

        formData.append("file", file);
        formData.append(
            "upload_preset",
            UPLOAD_PRESET
        );

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
            status.innerHTML = "Erro no upload. Tente novamente mais tarde.";
            return;
        }
    }

    status.innerHTML =
        "Obrigado por partilhar ❤️";
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