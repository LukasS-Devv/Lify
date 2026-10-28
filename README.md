# Lify

O Lify é um projeto experimental de aplicativo móvel para descoberta e
reprodução de música. Busca faixas e metadados no YouTube Music, mantém uma
biblioteca local e reproduz áudio por meio de um servidor Node.js independente.

> **Projeto de estudo, sem finalidade comercial.** O Lify é fornecido como
> projeto experimental, sem garantias de disponibilidade ou adequação para
> qualquer uso. Não é um serviço oficial do Spotify, do YouTube ou do Google,
> nem é afiliado ou endossado por essas empresas.

## O que o app faz

- Busca faixas e informações de catálogo usando `youtubei.js`.
- Na versão web, usa o backend para pesquisar o catálogo e carregar artistas,
  álbuns e playlists.
- Reproduz áudio em segundo plano com `react-native-track-player`.
- Mantém favoritos, histórico, playlists e preferências no próprio dispositivo,
  usando SQLite; esses dados não são enviados ao servidor de áudio.
- Permite organizar uma fila de reprodução e importar playlists públicas do
  YouTube Music para a biblioteca local.
- Permite importar arquivos de áudio do dispositivo para playlists locais e
  reproduzi-los sem conexão.
- Permite guardar faixas para reprodução offline no aplicativo móvel.
- Permite exportar/importar backups da biblioteca e agendar cópias locais
  diárias, semanais ou mensais. O sistema pode atrasar as tarefas em segundo
  plano; os backups portáteis `.lifybackup` incluem os arquivos de áudio
  importados e podem ser exportados ou restaurados em outro aparelho.
- Oferece interface em português e inglês, escolha do servidor de áudio e
  reprodução fixa no perfil de poupança de dados.

O aplicativo é feito com React Native, Expo e Expo Router. É necessário um
**development build**: os módulos nativos de reprodução e SQLite não funcionam
no Expo Go.

## Como funciona o backend

O servidor de áudio está em [`backend/`](./backend/). Ele é uma API Node.js
independente, não um servidor de contas ou de biblioteca. O app envia o ID de
uma faixa; o servidor usa `yt-dlp` para resolver uma URL de áudio disponível e
encaminha a resposta do YouTube CDN ao player.

```text
App mobile ── busca e metadados ──> YouTube Music (youtubei.js)
App web ── catálogo ──> API Node ──> YouTube Music (youtubei.js)
 │
 ├── ID da faixa ──> API Node (yt-dlp) ──> YouTube CDN ──> player
 └── biblioteca, fila e preferências ──> SQLite no dispositivo
```

O endpoint de áudio encaminha pedidos HTTP `Range`, necessários para o player
procurar diferentes posições da faixa. O servidor não acumula o áudio inteiro
na memória nem o guarda em cache; mantém em cache, por tempo limitado, apenas
metadados da resolução e URLs temporárias. O app usa sempre o perfil
`dataSaver`; a API também mantém o perfil `standard` para compatibilidade com
outros clientes. Se um bloco tardio do Innertube falhar, a próxima tentativa
usa yt-dlp por até dois minutos. Há limites para resoluções simultâneas e
timeouts para pedidos. O endpoint
`/health` informa se o servidor está ativo.

Rotas da API:

- `GET /health`
- `GET /stream/:videoId?profile=standard`
- `GET /stream/:videoId?profile=dataSaver`
- `GET /download/:videoId?profile=dataSaver` para downloads explícitos.
- `GET /catalog/search`, `/catalog/suggestions`, `/catalog/artist/:id`,
  `/catalog/collection/:kind/:id` e `/catalog/related/:videoId` para o catálogo
  usado pelo cliente web.

O perfil `dataSaver` é o usado pelo app. A API também aceita `standard` em
`/stream` para compatibilidade com outros clientes. Consulte o
[`README do backend`](./backend/README.md) para detalhes dos resolvedores,
timeouts, pedidos `Range`, configuração e publicação.

## Executar localmente

### App

Requer Node.js compatível com Expo SDK 57 e um ambiente de desenvolvimento
Android ou iOS configurado. Na raiz do repositório:

```powershell
cd frontend
npm install
npx expo prebuild
npm run android
```

Também é possível criar um development build com EAS. Os scripts da raiz
encaminham os comandos `start`, `android`, `ios`, `test` e `typecheck` para
`frontend/`.

### Servidor de áudio

Requer Node.js 22 ou superior. Em outro terminal, na raiz do repositório:

```powershell
cd backend
npm install
npm run dev
```

O servidor escuta na porta `4000` por padrão. Para escolher outra porta,
defina a variável `PORT`. Para iniciar em modo normal, use `npm start`.

O app não vem com um servidor de áudio predefinido. Na primeira abertura, ele
mostra um aviso para configurar o endereço em **Ajustes → Servidor de áudio**.
Inicie sua própria cópia do backend e informe o respectivo endereço. 
Em um dispositivo físico, use o endereço local do
computador e conecte ambos à mesma rede. Esses valores são instruções de
configuração e não vêm preenchidos no app ou no build.

O app também permite escolher um servidor personalizado em **Ajustes → Servidor
de áudio**. Um servidor personalizado precisa implementar as rotas e encaminhar
os pedidos `Range` descritos acima.

### Exportar e publicar a versão web

Com o Firebase CLI instalado e autenticado (`firebase login`), na raiz do
repositório:

```powershell
npm run web:export
npm run hosting:deploy
```

O primeiro comando gera os arquivos estáticos em `frontend/dist`; o segundo
gera a exportação e publica **somente o frontend estático** no Firebase Hosting
do projeto `lifymusic`, em <https://lifymusic.web.app>. O deploy não publica,
instala nem configura o backend. Para publicar apenas uma exportação já gerada,
execute `firebase deploy --only hosting`.

**O backend não faz parte desta hospedagem e não será enviado ao Firebase.**
Para busca e reprodução, o app web precisa que você hospede o backend
separadamente e informe a URL dele em **Ajustes → Servidor de áudio**. A
biblioteca e as preferências continuam armazenadas localmente no navegador.

## Interface e inspiração visual

A interface foi inspirada em padrões visuais de aplicativos de streaming,
especialmente na organização de conteúdo, navegação e apresentação do player
associadas ao Spotify. O Lify é um projeto independente e não representa o
Spotify. Parte das telas e dos componentes deriva de um projeto de interface
distribuído sob licença MIT; os créditos e avisos de licença estão em
[`frontend/THIRD_PARTY_NOTICES.md`](./frontend/THIRD_PARTY_NOTICES.md).

## Uso do servidor e serviços de terceiros

O servidor incluído existe para desenvolvimento e experimentação neste projeto;
não é uma oferta de hospedagem ou um serviço público para uso comercial. Quem
quiser usar a API deve **copiar o diretório `backend/` para seu próprio ambiente,
instalá-lo e iniciá-lo localmente**, ou em infraestrutura sob seu próprio
controle. Não dependa de uma instância hospedada por outra pessoa.

O app e o backend interagem com serviços e conteúdos de terceiros, incluindo
YouTube/YouTube Music e o YouTube CDN. Antes de executar ou disponibilizar uma
cópia, cada pessoa deve verificar e cumprir, por sua própria conta, os termos,
condições, políticas e leis aplicáveis desses terceiros. O fato de o código
estar disponível não concede direitos sobre conteúdos, não constitui
autorização do YouTube ou de titulares de direitos e não garante que qualquer
uso seja permitido. O mantenedor deste projeto não fornece aconselhamento
jurídico nem assume a responsabilidade pelo uso feito por terceiros.

## Desenvolvimento e testes

```powershell
# App: testes de lógica e verificação TypeScript
cd frontend
npm test
npm run typecheck

# API: testes do servidor
cd ..\backend
npm test
```

## Estrutura

- `frontend/src/app/` — rotas e telas do aplicativo.
- `frontend/src/components/` — componentes reutilizáveis e interface.
- `frontend/src/features/` — lógica e estado das funcionalidades.
- `frontend/src/services/catalog/` — busca e integração com o catálogo.
- `frontend/src/services/audio/` — fila, controle e serviço de reprodução.
- `frontend/src/database/` — banco SQLite, migrações e repositórios.
- `frontend/src/storage/backups/` — backups manuais e agendados.
- `backend/` — API Node.js para resolver e encaminhar áudio.
- `frontend/THIRD_PARTY_NOTICES.md` — créditos e licenças de terceiros.
