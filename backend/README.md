# Lify Stream API

Backend Node.js independente para resolver e encaminhar áudio do YouTube. O
serviço oferece `GET /health` para monitoramento e
`GET /stream/:videoId?profile=standard` (também aceita `dataSaver`) para o app.

## Streaming e latência

- A resolução de uma faixa usa `yt-dlp`; URLs resolvidas são mantidas em cache
  por até cinco minutos, sem ultrapassar a expiração indicada pelo YouTube.
- Pedidos simultâneos pela mesma faixa compartilham uma única resolução.
- O serviço executa no máximo quatro resoluções `yt-dlp` simultâneas; pedidos
  acima do limite recebem `503` com `Retry-After: 2`.
- A resolução `yt-dlp` tem timeout de 15 segundos. A conexão upstream tem
  timeout de 15 segundos e o fluxo de áudio tem timeout de inatividade de
  30 segundos.

O cache contém apenas metadados/URLs temporárias de resolução, não o áudio.
Assim, o encaminhamento continua compatível com pedidos `Range` e seek, sem
armazenar conteúdo protegido ou servir URLs depois da expiração.

## Executar localmente

Requer Node.js 22 ou superior.

```powershell
npm install
npm run dev
```

Por padrão, o servidor escuta na porta `4000`.

## Publicar no Render

O arquivo `../render.yaml` contém o blueprint de deploy. Crie um Web Service a
partir desse blueprint; ele já define `Backend/` como raiz, instala com `npm ci`,
inicia com `npm start` e verifica `/health`.

Também é possível criar um Web Service manualmente com:

- **Root Directory:** `Backend`
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`
- **Runtime:** Node

O app não aponta para uma instância mantida por este projeto. Se hospedar uma
cópia própria do backend, informe seu endereço HTTPS em **Ajustes → Servidor de
áudio** no app.

## Testes

```powershell
npm test
```
