const express = require('express');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;
const linkPadrao = `http://localhost:${PORT}/stream?url=`;
const playlist = [
    "https://music.youtube.com/watch?v=U7NUU12t2ms",
    "https://music.youtube.com/watch?v=0Po9x1n0aQE",
    "https://music.youtube.com/watch?v=4REuyY89tfw"
];

// --- FUNÇÃO DE TÉRMINO DO ÁUDIO ---
function onAudioEnd(videoUrl) {
    console.log(`[EVENTO] O áudio do link ${videoUrl} terminou de ser transmitido por completo.`);
    return true;
}

// --- CONFIGURAÇÃO DA ROTA DE STREAMING ---
app.get('/stream', (req, res) => {
    const videoUrl = req.query.url || req.query.id; 

    if (!videoUrl) {
        return res.status(400).send('Falta o parâmetro url ou id.');
    }

    res.setHeader('Content-Type', 'audio/mpeg');

    const ytdlp = spawn('yt-dlp', [
        '-o', '-', 
        '-f', 'ba', 
        '--no-playlist', 
        '--buffer-size', '16K',
        videoUrl
    ]);
    
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0', 
        '-acodec', 'libmp3lame', 
        '-f', 'mp3', 
        'pipe:1'
    ]);

    let audioFinalizado = false;
    let ytdlpTerminouComSucesso = false;
    let ffmpegTerminouComSucesso = false;

    ytdlp.on('close', (code) => {
        if (code === 0) {
            ytdlpTerminouComSucesso = true;
        }
    });

    ffmpeg.on('close', (code) => {
        if (code === 0) {
            ffmpegTerminouComSucesso = true;
        }

        if (ytdlpTerminouComSucesso && ffmpegTerminouComSucesso && !audioFinalizado) {
            audioFinalizado = true;
            onAudioEnd(videoUrl);
        }
    });

    // --- PROTEÇÃO CONTRA ERROS ---
    ytdlp.on('error', (err) => {
        console.error('Erro no yt-dlp:', err.message);
        if (!res.headersSent) res.status(500).send('Erro no yt-dlp');
    });

    ffmpeg.on('error', (err) => {
        console.error('Erro no FFmpeg:', err.message);
        if (!res.headersSent) res.status(500).send('Erro no FFmpeg.');
    });

    ytdlp.stdout.on('error', (err) => {
        if (err.code !== 'EPIPE') console.error('Erro no pipe do yt-dlp:', err.message);
    });
    
    // Tratamento seguro do EPIPE no FFmpeg (comum quando o cliente fecha a aba)
    ffmpeg.stdin.on('error', (err) => {
        if (err.code !== 'EPIPE') {
            console.error('Erro no pipe de entrada do FFmpeg:', err.message);
        }
    });

    ffmpeg.stdout.on('error', (err) => {
        if (err.code !== 'EPIPE') {
            console.error('Erro no pipe de saída do FFmpeg:', err.message);
        }
    });

    // --- CONEXÃO DOS FLUXOS ---
    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res).on('error', (err) => {
        // Ignora erros de EPIPE na resposta HTTP caso o cliente feche abruptamente
        if (err.code !== 'EPIPE') {
            console.error('Erro no fluxo de resposta:', err.message);
        }
    });

    req.on('close', () => {
        ytdlp.kill();
        ffmpeg.kill();
    });
});

// --- FUNÇÃO PARA ABRIR A PLAYLIST NO NAVEGADOR ---
async function tocarPlaylist() {
    try {
        const openModule = await import('open');
        const open = openModule.default;

        console.log('Iniciando o servidor e abrindo a playlist...');
        
        for (let i = 0; i < playlist.length; i++) {
            const musicaAtual = playlist[i];
            const numeroMusica = i + 1;

            console.log(`Tocando Música ${numeroMusica} de ${playlist.length}`);
            
            // Abre a música atual no navegador
            await open(linkPadrao + encodeURIComponent(musicaAtual));

            // Dica: Como o navegador abre abas independentes, damos um tempo maior 
            // proporcional ao tamanho médio de uma música (ex: 3 minutos = 180000ms)
            // ou você pode ajustar conforme preferir.
            await new Promise(resolve => setTimeout(resolve, 180000)); 
        }

    } catch (error) {
        console.error('Erro ao abrir o navegador:', error);
    }
}

// --- INICIA O SERVIDOR E DEPOIS A PLAYLIST ---
app.listen(PORT, () => {
    console.log(`API de Streaming rodando na porta ${PORT}`);
    tocarPlaylist();
});