const express = require('express');
const fetch = require('node-fetch');
const ytDlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Readable } = require('stream');

const app = express();
ffmpeg.setFfmpegPath(ffmpegPath);
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(express.urlencoded({ extended:true}));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index");
});

app.post('/get-info', async (req, res) => {
    try {
        const videoUrl = req.body.url;
        
        // Get video info
        const info = await ytDlp(videoUrl, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true
        });

        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            url: videoUrl
        });

    } catch(error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch video information' });
    }
});

app.post('/download-mp3', async (req, res) => {
    try {
        const videoUrl = req.body.url;
        const title = req.body.title.replace(/[^\w\s]/gi,'');
        
        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        // Download and pipe audio
        const audio = ytDlp.exec(videoUrl, {
            output: '-',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true
        });

        const audioStream = new Readable().wrap(audio.stdout);
        
        const ffmpegCommand = ffmpeg(audioStream)
            .audioBitrate(128)
            .format('mp3');

        ffmpegCommand.pipe(res, { end: true });

        req.on('close', () => {
            console.log('Client aborted download. Stopping FFmpeg...');
            ffmpegCommand.kill('SIGKILL');
            audio.kill();
        });

        ffmpegCommand.on('error', (err) => {
            console.error('FFmpeg error:', err);
            if (!res.headersSent) {
                res.status(500).send('Conversion Failed');
            }
        });

    } catch(error) {
        console.error('Error:', error);
        res.status(500).send('Failed to process request');
    }
});

app.listen(PORT,()=>{
    console.log(`Listening on port ${PORT}`);
});
