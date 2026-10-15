# Lify — fase 1 (funcional)

App React Native (Expo SDK 57, Expo Router) 100% on-device: busca e extração de áudio via `youtubei.js`, reprodução com `react-native-track-player`, dados em SQLite (`expo-sqlite`). Arquitetura completa em `(Lify)spoticrack_arquitetura.md`.

## Rodar
Precisa de **development build** (track-player e sqlite são nativos; não roda no Expo Go):
```
npm install
npx expo prebuild        # ou: eas build --profile development
npm run android          # / npm run ios
npm test                 # testes de lógica (Node, sem emulador)
npm run typecheck
```

## Estrutura
```
index.ts                 entry: registra o playback service + expo-router
src/app/                 ROTAS (finas, só compõem componentes + hooks)
  _layout.tsx              abre DB (migrations) + player; Stack
  (tabs)/                  index · search · library · playlists · settings (+ MiniPlayer)
  player.tsx               modal do player (controles, repeat, fila)
  playlist/[id].tsx        detalhe da playlist
src/features/            hooks por feature (estado + casos de uso)
src/components/          UI reutilizável simples  ← alvo da fase visual
src/theme/tokens.ts      cores, espaçamentos, fontes ← alvo da fase visual
src/services/catalog/    CatalogProvider (interface) + youtube.ts (youtubei.js)
src/services/audio/      controller (player), queue (lógica pura), store (zustand), playbackService
src/database/            client + migrations (PRAGMA user_version) + repositories
src/storage/backups/     exportar/importar .db
src/types, src/utils
test/unit/               testes (node:sqlite + tsx)
```

## Decisões
- **Fila própria** (zustand + `queue.ts`): o TrackPlayer carrega só a faixa atual; a URL é resolvida na hora de tocar (URLs do YouTube expiram). Em erro de reprodução há 1 retry automático re-resolvendo o stream.
- **Fila automática**: ao tocar a última faixa, anexa relacionadas (`getUpNext`).
- **Provider trocável**: se o scraping quebrar, só `services/catalog/youtube.ts` muda.
- **Importar backup** valida o arquivo, migra para o schema atual, cria backup de segurança e substitui os dados numa transação.
- **Tabs headless** (`expo-router/ui`): navegação pronta, aparência livre.

## Fase visual — onde mexer
1. `src/theme/tokens.ts` (paleta, tipografia, raios).
2. `src/components/*` (TrackRow, MiniPlayer, Button, Screen…).
3. `src/app/(tabs)/_layout.tsx` (TabButton: ícones/animação) e layout das telas.
4. Player: trocar a barra de seek por slider arrastável, animações, capa grande.
As telas não têm lógica de negócio, então o redesign não toca em `features/`, `services/` ou `database/`.

## Limitações conhecidas
- Nunca testado em dispositivo real neste ambiente (sem emulador): typecheck, bundle Metro (Android) e testes de lógica passam; **a extração de áudio do YouTube precisa ser validada num aparelho** e pode exigir ajustes (clientes `ANDROID/IOS/TV`, PO token) pois o YouTube muda com frequência.
- `react-native-track-player` 4.1.2 roda com a New Architecture via interop; se houver problema no build, avaliar a versão nightly 5.x.
- Sem lyrics, downloads offline, nem busca de álbuns/artistas ainda.
