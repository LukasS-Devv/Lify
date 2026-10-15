# 🟢 Lify — Documento de Arquitetura Final 
### Engenharia Mobile Independente (Serviceless & On-Device)

Este documento estabelece as especificações técnicas definitivas para o **Lify**, um ecossistema de música móvel e web desenvolvido em **React Native**. A arquitetura foi otimizada para ser **100% autônoma e descentralizada**, rodando nativamente no dispositivo do usuário final sem a necessidade de um servidor intermediário (Node.js) ou custos com APIs pagas.

---

## 🚀 1. Filosofia do Projeto e Recursos "Destravados"

O Lify entrega uma experiência idêntica aos planos Premium do **Spotify** e do **YouTube Music**, quebrando as limitações comerciais de forma totalmente gratuita e legal, rodando o processamento de forma embutida (*on-device*).

### 🚫 Recursos Destravados do YouTube Music Premium:
* **Áudio em Segundo Plano:** O áudio continua tocando de forma fluida mesmo com a tela do telemóvel apagada ou com outros aplicativos abertos.
* **Experiência 100% Sem Anúncios:** Os blocos de áudio são puxados limpos direto da fonte de mídia, pulando propagandas visuais ou sonoras.
* **Modo Apenas Áudio Forçado:** Consumo mínimo de dados de rede por ignorar completamente o download dos streams de vídeo.

### 🚫 Recursos Destravados do Spotify Premium:
* **Navegação Sob Demanda Completa:** Sem modo aleatório (shuffle) obrigatório em dispositivos móveis. Você escolhe exatamente o que quer ouvir.
* **Pulos Ilimitados (Skipping):** Liberdade total para avançar ou retroceder faixas na fila de reprodução sem limites por hora.
* **Interface Premium Clone:** Tema escuro elegante com gerenciamento dinâmico de filas, playlists e visualização de capas de álbuns.

---

## 🛠️ 2. Nova Arquitetura Técnica (100% Mobile Nativa)

Ao trazer toda a inteligência do sistema para dentro do ecossistema móvel do React Native, eliminamos a necessidade de manter servidores ligados em casa ou IPs residenciais expostos à internet.

```
[ Usuário digita na UI ]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│               REACT NATIVE APPLICATION                 │
│                                                        │
│  1. JavaScript Scraping (Forks de youtubei.js / ytdl)  │
│     ─ Puxa HTML do YouTube e extrai URL de áudio .m4a  │
│                                                        │
│  2. Gerenciador de Áudio Nativo (Track Player)         │
│     ─ Alimenta ExoPlayer (Android) / AVFoundation (iOS)│
│                                                        │
│  3. Banco de Dados Local (SQLite .db)                  │
│     ─ Salva Playlists e Preferências nativamente       │
└────────────────────────────────────────────────────────┘
          │
          ▼
[ Áudio toca instantaneamente "aos bocados" ]
```

### Como o aplicativo substitui o `yt-dlp` e o `ffmpeg`:

1. **A Extração JavaScript (Substituindo o `yt-dlp`):** O aplicativo usa pacotes puramente escritos em JavaScript (como forks modernos de `ytdl-core` ou bibliotecas como `youtubei.js`). Quando o usuário pesquisa uma música, a biblioteca realiza uma requisição `fetch` invisível para o código HTML da página do YouTube. O algoritmo varre a página e decodifica a variável oculta `ytInitialPlayerResponse`, capturando a URL de streaming direto da faixa de áudio separada do vídeo (geralmente arquivos de áudio comprimidos em `.m4a` ou `.webm`).
2. **A Decodificação de Hardware (Substituindo o `ffmpeg`):** No celular, **não precisamos de conversão para MP3**. Os smartphones modernos possuem chips dedicados e decodificadores nativos instalados de fábrica no sistema operacional. O **ExoPlayer (Android)** e o **AVFoundation (iOS)** conseguem ler nativamente codecs complexos de streaming da web (como Opus e AAC). O React Native simplesmente injeta a URL direta de áudio encontrada no player nativo do celular, que gerencia o buffering de forma extremamente leve e eficiente.

---

## 📂 3. Banco de Dados Local (Descentralizado & Sem Contas)

Para manter o foco em privacidade, portabilidade e zero custo de infraestrutura, o Lify não possui um sistema de cadastro ou servidores em nuvem. Cada dispositivo funciona como uma instância totalmente isolada.

* **Motor do Banco de Dados:** **SQLite** via biblioteca nativa para React Native (`expo-sqlite` ou `react-native-sqlite-storage`).
* **Estrutura de Armazenamento:** Todas as músicas favoritadas, histórico de reprodução e dados estruturados de listas criadas ficam salvos localmente em um único arquivo de extensão `.db`.
* **Portabilidade (Import/Export):** O aplicativo disponibiliza duas funções universais:
  * **Exportar Backup:** Clona o arquivo `.db` interno e permite ao usuário salvá-lo no armazenamento do telemóvel.
  * **Importar Backup:** Lê um arquivo `.db` externo previamente gerado e substitui o banco atual, permitindo migrar playlists inteiras entre diferentes telemóveis instantaneamente.

---

## 🔄 4. O Fluxo de Execução Atualizado

1. **Busca e Sugestão:** O usuário digita o nome de um artista ou faixa na interface React Native. O app dispara uma busca assíncrona, parseia a resposta estruturada e renderiza os cards visuais com capas extraídas diretamente de `https://i.ytimg.com/vi/[ID]/hqdefault.jpg`.
2. **Resolução de Link:** Ao clicar no card, o algoritmo do wrapper JavaScript localiza e extrai em milissegundos a URL limpa do fluxo de áudio `.m4a`.
3. **Reprodução em Background:** A URL é enviada para o `react-native-track-player`. O sistema operacional assume o controle, iniciando o download sob demanda ("aos bocados") dos chunks de som. As notificações integradas da central de mídia do celular ganham os metadados corretos, permitindo pausar e passar músicas a partir da tela de bloqueio do celular.
4. **Fila Automática:** Em paralelo à reprodução, o app dispara uma consulta secundária de vídeos relacionados para preencher o array da fila de reprodução, garantindo uma experiência contínua e sem interrupções.

---
*Este plano de arquitetura consolidado serve como guia definitivo para o início do desenvolvimento local e compilação do aplicativo.*
