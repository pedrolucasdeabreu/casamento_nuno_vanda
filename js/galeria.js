async function carregar() {

    const response =
        await fetch("data/gallery.json");

    const arquivos =
        await response.json();

    const gallery =
        document.getElementById("gallery");

    gallery.innerHTML = "";

    arquivos.forEach(item => {

        if(item.resource_type === "image") {

            gallery.innerHTML += `
            <img
            src="${item.url}">
            `;
        }

        if(item.resource_type === "video") {

            gallery.innerHTML += `
            <video controls>
            <source
            src="${item.url}">
            </video>
            `;
        }

    });
}

carregar();

setInterval(carregar,10000);