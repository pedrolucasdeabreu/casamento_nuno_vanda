async function gerarDesafio() {

    try {

        const response =
            await fetch("data/desafios.json");

        const desafios =
            await response.json();

        const indice =
            Math.floor(
                Math.random() * desafios.length
            );

        const desafio =
            desafios[indice];

        document.getElementById(
            "desafio"
        ).innerHTML = desafio;

        localStorage.setItem(
            "desafioAtual",
            desafio
        );

        const btnCumprir = document.getElementById(
            "btnCumprirDesafio"
        );

        if (btnCumprir) {
            btnCumprir.style.display = "block";
        }

    }

    catch (erro) {

        console.error(erro);

        document.getElementById(
            "desafio"
        ).innerHTML =
            "Erro ao carregar os desafios.";

    }

}