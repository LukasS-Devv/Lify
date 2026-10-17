# Lify — Arquitetura do aplicativo e do backend

O Lify é um aplicativo React Native com busca no YouTube Music, reprodução em
segundo plano e biblioteca local. A busca e os dados pessoais permanecem no
app; um backend Node resolve e encaminha o áudio do YouTube, incluindo pedidos
de intervalo usados pelo seek do player.

## 1. Responsabilidades

O app é responsável pela interface, fila, player nativo e SQLite. O backend
recebe apenas o ID do vídeo solicitado, usa `yt-dlp` para resolver o stream e
encaminha ao player os dados e cabeçalhos HTTP necessários, incluindo Range.
O backend não recebe nem armazena favoritos, histórico ou playlists.

```text
React Native app ── busca/metadados ──> YouTube Music via youtubei.js
       │
       ├── GET /stream/:videoId ──────> Node API (porta 4000 localmente)
       │                                  yt-dlp ──> proxy Range ──> YouTube CDN
       ├── áudio com Range ──────────> TrackPlayer / ExoPlayer
       └── biblioteca e preferências ─> SQLite local
```

## 2. Por que há um backend?

`youtubei.js` continua sendo usado para busca e metadados. O `yt-dlp` roda no
backend e resolve uma URL de áudio atualizada junto com os cabeçalhos exigidos
pelo YouTube. O endpoint valida IDs de vídeo de 11 caracteres e só aceita
origens HTTPS do domínio `googlevideo.com`.

## 3. Banco de dados local

Favoritos, histórico e playlists são mantidos no dispositivo; o servidor de
áudio não sincroniza esses dados.

* **Motor:** SQLite via `expo-sqlite`.
* **Portabilidade:** exportar/importar backup do banco local.

## 4. Fluxo de execução

1. **Busca e sugestões:** o app consulta YouTube Music via `youtubei.js` e
   exibe resultados e capas.
2. **Resolução e encaminhamento:** ao tocar uma faixa, o app solicita
   `/stream/:videoId?profile=...` ao backend. `yt-dlp` resolve o formato de
   áudio conforme o perfil (`dataSaver` ou `standard`); o backend encaminha o
   áudio e os pedidos Range ao YouTube CDN.
3. **Reprodução em segundo plano:** o TrackPlayer recebe o áudio encaminhado,
   incluindo suporte a intervalos para permitir buscar qualquer posição. O modo
   padrão configura buffer de 30 segundos; poupança de dados usa 5–15 segundos.
4. **Fila automática:** o app busca vídeos relacionados via `youtubei.js` para
   preencher sua fila local.

## 5. Execução e deploy

O backend Node local escuta em `0.0.0.0:4000`. No Android Emulator, o app usa
`http://10.0.2.2:4000`; em um aparelho físico, usa o IP LAN do computador.
Em Ajustes, cada usuário escolhe o Lify server principal ou informa a URL base
de um servidor personalizado, salva localmente no aparelho. Ambos devem
implementar `GET /stream/:videoId?profile=standard` (ou `profile=dataSaver`),
além de encaminhar o cabeçalho HTTP Range.
