const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3012;

console.log('Starting CDN Services with Image Processing...');

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // İzin verilen origin'ler
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3012',
            'http://eticaretsite.nlk',
            'https://eticaretsite.nlk',
            'http://127.0.0.1:3000',
            'null' // file:// protokolü için
        ];

        // Origin yoksa (Postman gibi) veya izin verilenler listesindeyse
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Geliştirme ortamında tüm origin'lere izin ver
            if (process.env.NODE_ENV === 'development') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type']
};

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dizinleri oluştur
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const CACHE_DIR = path.join(__dirname, '../cache');

// Dizinlerin varlığını kontrol et
async function ensureDirectories() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        await fs.mkdir(CACHE_DIR, { recursive: true });
        console.log('Directories created/verified');
    } catch (error) {
        console.error('Error creating directories:', error);
    }
}

ensureDirectories();

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg|bmp|tiff/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'cdn-services',
        features: ['image-upload', 'image-processing', 'format-conversion', 'resizing'],
        timestamp: new Date().toISOString()
    });
});

// Ana route
app.get('/', (req, res) => {
    res.json({
        message: 'CDN Services with Image Processing',
        version: '2.0.0',
        endpoints: {
            health: '/health',
            upload: 'POST /api/upload',
            image: 'GET /api/image/:id',
            processedImage: 'GET /api/image/:id/:size/:format',
            info: '/info',
            metrics: '/metrics'
        },
        supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'],
        supportedSizes: ['thumbnail', 'small', 'medium', 'large', 'original', 'custom (e.g., 200x300)'],
        examples: [
            '/api/image/abc123/100x100/webp',
            '/api/image/abc123/thumbnail/jpeg',
            '/api/image/abc123/500x500/png'
        ]
    });
});

// Dosya yükleme endpoint'i
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileInfo = {
            id: path.parse(req.file.filename).name,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
            urls: {
                original: `/api/image/${path.parse(req.file.filename).name}`,
                thumbnail: `/api/image/${path.parse(req.file.filename).name}/thumbnail/jpeg`,
                small: `/api/image/${path.parse(req.file.filename).name}/300x300/webp`,
                medium: `/api/image/${path.parse(req.file.filename).name}/800x800/webp`,
                large: `/api/image/${path.parse(req.file.filename).name}/1920x1080/webp`
            }
        };

        res.json({
            success: true,
            file: fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed', message: error.message });
    }
});

// Orijinal görüntüyü getir
app.get('/api/image/:id', async (req, res) => {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const file = files.find(f => f.startsWith(req.params.id));

        if (!file) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const filePath = path.join(UPLOAD_DIR, file);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// İşlenmiş görüntüyü getir
app.get('/api/image/:id/:size/:format', async (req, res) => {
    try {
        const { id, size, format } = req.params;

        // Desteklenen formatları kontrol et
        const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
        if (!supportedFormats.includes(format.toLowerCase())) {
            return res.status(400).json({ error: 'Unsupported format' });
        }

        // Orijinal dosyayı bul
        const files = await fs.readdir(UPLOAD_DIR);
        const originalFile = files.find(f => f.startsWith(id));

        if (!originalFile) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const originalPath = path.join(UPLOAD_DIR, originalFile);

        // Boyut ayarlarını parse et
        let width, height;
        const presetSizes = {
            thumbnail: { width: 150, height: 150 },
            small: { width: 300, height: 300 },
            medium: { width: 800, height: 800 },
            large: { width: 1920, height: 1080 }
        };

        if (presetSizes[size]) {
            ({ width, height } = presetSizes[size]);
        } else if (size.includes('x')) {
            [width, height] = size.split('x').map(Number);
            if (isNaN(width) || isNaN(height)) {
                return res.status(400).json({ error: 'Invalid size format' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid size parameter' });
        }

        // Cache key oluştur
        const cacheKey = `${id}_${width}x${height}_${format}`;
        const cachePath = path.join(CACHE_DIR, `${cacheKey}.${format}`);

        // Cache'te var mı kontrol et
        try {
            await fs.access(cachePath);
            console.log(`Serving from cache: ${cacheKey}`);
            return res.sendFile(cachePath);
        } catch {
            // Cache'te yok, işle
        }

        // Görüntüyü işle
        console.log(`Processing image: ${id} -> ${width}x${height} ${format}`);

        let sharpInstance = sharp(originalPath);

        // Boyutlandır
        sharpInstance = sharpInstance.resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
        });

        // Format dönüşümü
        switch (format.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                sharpInstance = sharpInstance.jpeg({ quality: 85 });
                break;
            case 'png':
                sharpInstance = sharpInstance.png({ compressionLevel: 8 });
                break;
            case 'webp':
                sharpInstance = sharpInstance.webp({ quality: 85 });
                break;
            case 'gif':
                sharpInstance = sharpInstance.gif();
                break;
        }

        // İşlenmiş görüntüyü cache'e kaydet
        const processedBuffer = await sharpInstance.toBuffer();
        await fs.writeFile(cachePath, processedBuffer);

        // Content-Type ayarla
        const contentType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000'); // 1 yıl cache

        res.send(processedBuffer);
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image', message: error.message });
    }
});

// Görüntü bilgisi endpoint'i
app.get('/api/info/:id', async (req, res) => {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const file = files.find(f => f.startsWith(req.params.id));

        if (!file) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const filePath = path.join(UPLOAD_DIR, file);
        const metadata = await sharp(filePath).metadata();
        const stats = await fs.stat(filePath);

        res.json({
            id: req.params.id,
            filename: file,
            size: stats.size,
            uploadedAt: stats.birthtime,
            metadata: {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                space: metadata.space,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha
            },
            availableFormats: ['jpeg', 'png', 'webp', 'gif'],
            availableSizes: ['thumbnail', 'small', 'medium', 'large', 'custom']
        });
    } catch (error) {
        console.error('Error getting image info:', error);
        res.status(500).json({ error: 'Failed to get image info' });
    }
});

// Sistem bilgileri
app.get('/info', async (req, res) => {
    const [uploadCount, cacheCount] = await Promise.all([
        fs.readdir(UPLOAD_DIR).then(files => files.length).catch(() => 0),
        fs.readdir(CACHE_DIR).then(files => files.length).catch(() => 0)
    ]);

    res.json({
        service: 'cdn-services',
        version: '2.0.0',
        features: ['image-processing', 'format-conversion', 'dynamic-resizing', 'caching'],
        stats: {
            uploadedImages: uploadCount,
            cachedImages: cacheCount
        },
        limits: {
            maxFileSize: '50MB',
            supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff']
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    const metrics = `# HELP cdn_services_up CDN Services is up
# TYPE cdn_services_up gauge
cdn_services_up 1

# HELP cdn_services_version CDN Services version
# TYPE cdn_services_version gauge
cdn_services_version{version="2.0.0"} 1

# HELP process_uptime_seconds Process uptime
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Server başlat
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n================================');
    console.log('CDN Services - Image Processing');
    console.log('================================');
    console.log(`Port: ${PORT}`);
    console.log(`Upload Dir: ${UPLOAD_DIR}`);
    console.log(`Cache Dir: ${CACHE_DIR}`);
    console.log('\nEndpoints:');
    console.log(`  - Upload: POST http://localhost:${PORT}/api/upload`);
    console.log(`  - Original: GET http://localhost:${PORT}/api/image/:id`);
    console.log(`  - Processed: GET http://localhost:${PORT}/api/image/:id/:size/:format`);
    console.log('\nExamples:');
    console.log(`  - http://localhost:${PORT}/api/image/abc123/100x100/webp`);
    console.log(`  - http://localhost:${PORT}/api/image/abc123/thumbnail/jpeg`);
    console.log('================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});