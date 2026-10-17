# Lify — fase 2 (visual)

App React Native (Expo SDK 57, Expo Router): busca no YouTube Music via `youtubei.js`, reprodução via `react-native-track-player`, dados em SQLite (`expo-sqlite`). Um backend Node (`yt-dlp`) resolve e encaminha o áudio do YouTube, incluindo pedidos de intervalo para permitir seek. Arquitetura completa em `(Lify)spoticrack_arquitetura.md`.

## Rodar
Precisa de **development build** (track-player e sqlite são nativos; não roda no Expo Go):
```
npm install
npx expo prebuild        # ou: eas build --profile development
npm run android          # / npm run ios
npm test                 # testes de lógica (Node, sem emulador)
npm run typecheck
```

## Servidor de áudio

O backend fica em `functions/` e oferece `GET /stream/:videoId` e `GET /health`.
Ele usa `yt-dlp` para resolver a URL do áudio e encaminha o stream original,
preservando pedidos HTTP Range para que o player possa buscar posições. Para
desenvolvimento:

```
Copy-Item .env.example .env
cd functions
npm install
cd ..
npm run server
```

Se o YouTube bloquear uma faixa (por exemplo, HTTP 403), o servidor registra a
falha de extração e responde HTTP 502 para aquela solicitação; isso não deve
encerrar o processo Node. O áudio é encaminhado em stream, sem ser acumulado
inteiro na memória do servidor.

O servidor escuta na porta `4000`. Copie `.env.example` para `.env`. O endereço
inicial `http://10.0.2.2:4000` conecta o Android Emulator ao computador; num
aparelho físico, configure `EXPO_PUBLIC_LIFY_SERVER_URL` com o IP LAN do
computador, por exemplo `http://192.168.1.20:4000`, e deixe ambos na mesma rede.
Depois de alterar o endereço HTTP, regenere e recompile o development build
Android com `npx expo prebuild --platform android` e `npx expo run:android`.

Em **Ajustes → Servidor de áudio**, o usuário escolhe o Lify server (principal)
ou um servidor personalizado. Configure `EXPO_PUBLIC_LIFY_SERVER_URL` com o
endereço do servidor principal no build do app; o servidor personalizado é salvo
localmente no aparelho e precisa implementar `GET /stream/:videoId?profile=standard`
(também aceita `profile=dataSaver`).

Em **Ajustes → Reprodução**, escolha **Poupança de dados** (formato de menor
bitrate disponível e buffer de 5–15 segundos) ou **Padrão** (áudio de até
128 kbps quando disponível e buffer de 30 segundos). O servidor seleciona um
formato já existente, sem recodificar o áudio. O perfil de bitrate é enviado ao
servidor a cada faixa; feche e abra o app depois de mudar a opção para aplicar
o novo buffer do player.

## Estrutura
```
index.ts                 entry: registra o playback service + expo-router
src/app/                 ROTAS (finas, só compõem componentes + hooks)
  _layout.tsx              abre DB (migrations) + player; Stack
  (tabs)/                  index · search · library (+ MiniPlayer)
  settings.tsx             ajustes (stack)
  player.tsx               modal do player (controles, repeat, fila)
  playlist/[id].tsx        detalhe da playlist
src/features/            hooks por feature (estado + casos de uso)
src/components/          UI reutilizável simples  ← alvo da fase visual
src/theme/tokens.ts      cores, espaçamentos, fontes ← alvo da fase visual
src/services/catalog/    busca via youtubei.js + URL do backend de áudio
src/services/audio/      controller (player), queue (lógica pura), store (zustand), playbackService
functions/               API Node/Firebase Functions (yt-dlp + proxy de áudio)
src/database/            client + migrations (PRAGMA user_version) + repositories
src/storage/backups/     exportar/importar .db
src/i18n/                textos (pt.ts) e t()
src/types, src/utils
test/unit/               testes (node:sqlite + tsx)
```

## Decisões
- **Fila própria** (zustand + `queue.ts`): o TrackPlayer carrega só a faixa atual; a URL é resolvida na hora de tocar (URLs do YouTube expiram). Em erro de reprodução há 1 retry automático re-resolvendo o stream.
- **Fila automática**: ao tocar a última faixa, anexa relacionadas (`getUpNext`).
- **Streams pelo backend**: o app envia apenas o ID da faixa; o backend resolve e encaminha o áudio com suporte a HTTP Range.
- **Provider de busca trocável**: se o scraping de catálogo quebrar, só `services/catalog/youtube.ts` muda.
- **Importar backup** valida o arquivo, migra para o schema atual, cria backup de segurança e substitui os dados numa transação.
- **Tabs headless** (`expo-router/ui`): navegação pronta, aparência livre.

## Visual (fase 2)
- **Tema**: `src/theme/tokens.ts`. Para trocar o acento do app inteiro, altere `accent`/`accentSoft`.
- **Navegação**: 3 abas (Início, Buscar, Biblioteca) com ícones + mini-player flutuante. Ajustes abre pelo ícone de engrenagem na Início (`src/app/settings.tsx`). A antiga aba Playlists foi para dentro da Biblioteca (filtros Playlists · Curtidas · Histórico).
- **Playlist**: cabeçalho em degradê, capa em mosaico 2x2, reordenar pelo menu ⋯ → "Editar ordem".
- **Player**: slider arrastável, degradê por faixa, repetir/embaralhar, fila rolável abaixo.
- **Cores por faixa/playlist**: determinísticas a partir do id (`src/utils/color.ts`), sem dependência nativa de extração de cor.
- **Dependências nativas novas** (exigem novo build): `expo-linear-gradient`, `@react-native-community/slider`, `@expo/vector-icons` (+ `expo-font`).

## Idiomas (i18n)
Português e inglês, trocados em **Ajustes → Idioma** (salvo no banco, aplicado ao abrir o app e ao importar um backup).
Textos em `src/i18n/pt.ts` (define as chaves) e `src/i18n/en.ts` (o TypeScript exige todas as chaves), usados com `t('chave', { params })`.
Plural: `chave_one` / `chave_other` com `{ count }`. Componentes com texto chamam `useTranslation()` para atualizar ao trocar o idioma.
Para adicionar outro idioma: crie o dicionário, registre em `src/i18n/index.ts` e acrescente a opção em Ajustes.

## Importar playlists públicas
Em **Biblioteca**, toque no ícone de importar (nuvem) e cole um link público de playlist do YouTube Music. O app mostra uma prévia
(nome, quantidade, primeiras faixas) e só grava ao confirmar; a playlist e as faixas são criadas numa única transação.
Para trazer uma playlist do Spotify, converta-a para o YouTube Music com um serviço como o [TuneMyMusic](https://www.tunemymusic.com/)
e cole o link da playlist convertida. Limite de 500 faixas por importação. Lógica em `src/features/playlists/importPlaylist*.ts`.

## Patches
`patches/react-native-track-player+4.1.2.patch` é aplicado automaticamente no `npm install` (`postinstall: patch-package`).

## Créditos
Ver `THIRD_PARTY_NOTICES.md`.

## Limitações conhecidas
- A reprodução depende do servidor Node estar online e acessível pelo aparelho; a busca continua usando `youtubei.js` no app. O servidor encaminha Range ao YouTube CDN para permitir seek.
- `react-native-track-player` 4.1.2 roda com a New Architecture via interop; se houver problema no build, avaliar a versão nightly 5.x.
- Sem lyrics, downloads offline, nem busca de álbuns/artistas ainda.
