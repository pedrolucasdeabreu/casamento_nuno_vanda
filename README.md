# Casamento Nuno & Vanda

Pequeno site para partilha de fotos e vídeos dos convidados, com geração de desafios e galeria sincronizada via Cloudinary.

**Estrutura de pastas**
```
/
├─ index.html
├─ upload.html
├─ desafios.html
├─ galeria.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ upload.js
│  ├─ galeria.js
│  └─ desafios.js
├─ data/
│  ├─ gallery.json
│  └─ desafios.json
├─ docs/
│  └─ cloudinary_setup.md
└─ README.md
```

**Arquivos principais**
- [index.html](index.html): página inicial.
- [upload.html](upload.html): formulário de upload (campo `#nome` para o nome do contribuidor).
- [desafios.html](desafios.html): gera desafios para os convidados.
- [galeria.html](galeria.html): visualização da galeria (carrega `data/gallery.json`).
- [js/upload.js](js/upload.js): lógica de upload, sanitização do nome e geração do `public_id`.
- [js/galeria.js](js/galeria.js): mostra a galeria no frontend.
- [js/desafios.js](js/desafios.js): lógica dos desafios.
- [css/style.css](css/style.css): estilos.
- [data/gallery.json](data/gallery.json), [data/desafios.json](data/desafios.json): dados usados localmente.
- [docs/cloudinary_setup.md](docs/cloudinary_setup.md): instruções para configurar Cloudinary e GitHub Actions.
- `qr_code.png`: QR code para acesso rápido à página (opcional).

**Comportamento de renomeação de ficheiros (upload)**
- O `upload.js` cria um `public_id` e renomeia o ficheiro enviado para o padrão:
  - `NOME_SANITIZADO_YYYY-MM-DD_HH-MM-SS.ext`
  - Exemplo: `pedro_lucas_2026-06-14_14-35-22.jpg`.
- Se o input `#nome` estiver vazio, o prefixo usado é `null` (ex.: `null_2026-06-14_14-35-22.jpg`).
- O timestamp está no formato `YYYY-MM-DD_HH-MM-SS` para máxima compatibilidade com sistemas de ficheiros locais.

**Como o nome é sanitizado** (função `sanitizeUserName` em `js/upload.js`):
- Aplica `normalize('NFD')` e remove marcas diacríticas (acentos) — `João` → `joao`.
- Converte para minúsculas.
- Espaços convertidos para `_`.
- Remove caracteres que não sejam `a-z`, `0-9`, `-` ou `_`.
- Colapsa `_` duplicados e remove `_` nas extremidades.

Isto garante que nomes com acentuação ficam sem acentos e seguros para URLs/public IDs.

**Configuração Cloudinary**
- Ver as instruções passo-a-passo em [docs/cloudinary_setup.md](docs/cloudinary_setup.md).
- Valores a ajustar em `js/upload.js`: `CLOUD_NAME`, `UPLOAD_PRESET` (no topo do ficheiro).

**Como testar localmente**
1. Abrir [upload.html](upload.html) num navegador moderno.
2. Preencher o campo de nome (opcional), selecionar uma imagem/video e clicar em `Enviar`.
3. Conferir o `status` na página e inspecionar o envio no painel do Cloudinary.
4. (Opcional) Disparar o workflow do GitHub Actions para sincronizar `data/gallery.json` conforme descrito em [docs/cloudinary_setup.md](docs/cloudinary_setup.md).

**Sugestões / pontos de atenção**
- A sanitização remove acentos e caracteres estranhos — útil para evitar problemas com public_id e URLs.
- Se quiser armazenar o nome original com acentuação no Cloudinary, envie-o num campo separado (`context`) além do `public_id` e `file`.
```
/
├─ index.html
├─ upload.html
├─ desafios.html
├─ galeria.html
├─ qr_code.png
├─ css/
│  └─ style.css
├─ js/
│  ├─ upload.js
│  ├─ galeria.js
│  └─ desafios.js
├─ data/
│  ├─ gallery.json
│  └─ desafios.json
├─ docs/
│  └─ cloudinary_setup.md
└─ README.md
```
