# Configuração Cloudinary + GitHub Actions

Passos resumidos para fazer uploads diretos do cliente e manter `data/gallery.json` sincronizado via GitHub Actions.

1) Criar conta Cloudinary
- Aceda a https://cloudinary.com/ e crie uma conta gratuita.
- No painel, copie o `Cloud name`, `API Key` e `API Secret` — precisaremos destes para o GitHub Actions.

2) Criar Upload Preset (unsigned)
- No painel do Cloudinary vá a `Settings` → `Upload` → `Upload presets`.
- Crie um preset com `Signing mode` = `Unsigned` (não é necessário API Secret no cliente).
- Dê-lhe o nome `casamento_nuno_vanda` (ou ajuste `js/upload.js` para usar outro nome).

3) Atualizar cliente
- No arquivo `js/upload.js` substitua `SEU_CLOUD_NAME` pelo seu `cloud name`.
- As uploads do cliente usam o `upload preset` unsigned, por isso não expõem segredos.
- **Novo:** O nome do utilizador é capturado do input e enviado como `context` ao Cloudinary.

4) Configurar GitHub Secrets
- No repositório GitHub vá a `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.
- Adicione as chaves:
  - `CLOUDINARY_CLOUD_NAME` = seu cloud name
  - `CLOUDINARY_API_KEY` = API Key (usada apenas pelo Actions)
  - `CLOUDINARY_API_SECRET` = API Secret (usada apenas pelo Actions)

5) O workflow
- O ficheiro `.github/workflows/sync_cloudinary.yml` faz fetch das imagens e vídeos usando a API Admin do Cloudinary e escreve `data/gallery.json`.
- O workflow corre a cada hora e também pode ser disparado manualmente em `Actions` → `Sync Cloudinary Gallery`.
- **Novo:** Extrai o campo `contributor` (nome do utilizador) e inclui em cada item de `gallery.json`.
- **Novo:** Ordena as imagens por data de criação (mais recentes primeiro).

7) Observações e limitações
- Isto não é em tempo-real: o workflow sincroniza periodicamente (por cron) e ao disparo manual.
- Se quiser processamento em tempo-real use um servidor ou serviço serverless que receba o webhook do Cloudinary e depois atualize o repositório via GitHub API (requer gestão segura de tokens).

8) Testes locais
- Faça um upload de teste através do formulário (`upload.html`) com um nome.
- Dispare o workflow manualmente para atualizar `data/gallery.json`.
- Confirme que o nome aparece no campo `contributor`.

Se quiser, eu posso:
- Ajustar `galeria.js` para consumir `data/gallery.json` e exibir o nome do contribuidor junto com cada imagem.
- Implementar uma versão do workflow que também redimensiona thumbs (usando URL transformations).
