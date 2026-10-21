# Lify Stream API

Backend Node.js independente para resolver e encaminhar áudio do YouTube. O
serviço oferece `GET /health` para monitoramento e
`GET /stream/:videoId?profile=standard` (também aceita `dataSaver`) para o app.

## Resolvedores

- **Innertube (principal):** usa `youtubei.js@^18` e chama os clientes
  `ANDROID_VR`, `IOS` e `TV`, nessa ordem, até um deles devolver um formato de
  áudio decifrado. Não usa cookies. Timeout de 8 segundos por resolução.
  - `standard`: maior bitrate ≤128 kbps; senão ≤160; senão o melhor.
  - `dataSaver`: maior bitrate ≤64 kbps; senão ≤96; senão o pior.
  - A sessão Innertube é única e criada de forma preguiçosa. É aquecida no
    arranque (`npm start`/`npm run dev`), não ao criar a app. É recriada a cada
    ~6 horas ou após 3 falhas seguidas.
- **yt-dlp (fallback):** usado quando o Innertube falha. Continua disponível com
  o mesmo comportamento de antes.
- **Desligar o Innertube:** defina `YT_RESOLVER=ytdlp` para usar apenas o yt-dlp.
- Os logs `[stream]` indicam o resolvedor usado no campo `resolver`
  (`innertube` ou `ytdlp`).

## Blocos de upstream (Innertube)

- Para URLs do Innertube, o proxy pede ao googlevideo blocos `bytes=a-b` de no
  máximo `UPSTREAM_CHUNK_BYTES` bytes (padrão `262144`, 256 KB), em sequência,
  numa ligação keep-alive partilhada, e escreve cada bloco na mesma resposta ao app.
- O padrão vem de uma medição: o googlevideo respondeu `206` a Range limitado
  até 256 KB, em qualquer offset e em pedidos seguidos na mesma URL, e `403` a
  partir de 512 KB ou com Range aberto/ausente. Valores acima de 256 KB tendem a
  receber `403`.
- `UPSTREAM_CHUNK_BYTES` aceita apenas inteiros positivos; valores inválidos usam o padrão.
- Sem `Range` do app: `200` com `Content-Length` = tamanho total e sem `Content-Range`.
- Com `Range: bytes=N-M` ou `bytes=N-`: `206` com `Content-Range` e `Content-Length`
  do intervalo, limitado ao tamanho total. Outros formatos de `Range` são tratados
  como ausentes.
- Se o primeiro bloco devolver `403`/`410`, o cache da faixa é apagado e a
  resolução é repetida uma vez pelo yt-dlp. Se um bloco posterior devolver
  `403`/`410`, o cache é apagado, a resposta é encerrada e o caso fica no log; o
  app repete o pedido a partir da posição atual.
- Os logs `[stream]` incluem `chunks` (blocos pedidos) e `chunkBytes`. URLs do
  yt-dlp não usam blocos.

## Streaming e latência

- URLs resolvidas são mantidas em cache por até 45 minutos (até 500 entradas),
  sem ultrapassar a expiração indicada pelo YouTube.
- Pedidos simultâneos pela mesma faixa compartilham uma única resolução.
- O serviço executa no máximo quatro resoluções simultâneas; pedidos acima do
  limite recebem `503` com `Retry-After: 2`.
- A resolução yt-dlp tem timeout de 45 segundos. A conexão upstream tem
  timeout de 30 segundos e o fluxo de áudio tem timeout de inatividade de
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
