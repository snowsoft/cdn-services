const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import auth middleware and storage
const { authenticate, optionalAuth } = require('./middleware/auth');
const storage = require('./storage/StorageManager');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3012;

console.log('Starting CDN Services with Image Processing...');

// CORS configuration - Tüm origin'lere izin ver
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Helmet güvenlik ayarları
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Diğer middleware'ler
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

// Multer konfigürasyonu - Memory storage kullan (storage adapter'a kaydetmek için)
const multerStorage = multer.memoryStorage();

const upload = multer({
    storage: multerStorage,
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
        features: ['image-upload', 'image-processing', 'format-conversion', 'resizing', 'authentication', 'multi-storage'],
        timestamp: new Date().toISOString()
    });
});

// Auth endpoint for testing (generate token)
// In production, this should be handled by your main auth service
app.post('/api/auth/token', async (req, res) => {
    try {
        const authService = require('./services/authService');
        
        // Simple token generation for testing
        // In production, validate user credentials first
        const { userId, email, role } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'userId is required'
            });
        }

        const payload = {
            id: userId,
            userId: userId,
            email: email || `user${userId}@example.com`,
            role: role || 'user',
        };

        const token = authService.generateToken(payload);

        res.json({
            success: true,
            token,
            tokenType: 'Bearer',
            expiresIn: config.security.jwtExpire,
            user: payload
        });
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({
            error: 'Token generation failed',
            message: error.message
        });
    }
});

// Ana route
app.get('/', (req, res) => {
    res.json({
        message: 'CDN Services with Image Processing',
        version: '2.0.0',
        endpoints: {
            health: '/health',
            authToken: 'POST /api/auth/token (Generate JWT token for testing)',
            upload: 'POST /api/upload (Auth Required)',
            list: 'GET /api/images',
            image: 'GET /api/image/:id',
            delete: 'DELETE /api/image/:id (Auth Required)',
            processedImage: 'GET /api/image/:id/:size/:format',
            imageInfo: 'GET /api/info/:id',
            systemInfo: '/info',
            metrics: '/metrics'
        },
        features: {
            authentication: 'JWT-based authentication',
            storage: 'Multi-disk storage support (local, s3, azure, gcs)',
            imageProcessing: 'Dynamic image resizing and format conversion'
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

// Dosya yükleme endpoint'i - AUTH İLE KORUNMUŞ
app.post('/api/upload', authenticate, upload.single('image'), async (req, res) => {
    try {
        console.log('Upload request received from user:', req.userId);

        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File uploaded:', req.file.originalname);

        // Generate unique filename
        const uniqueId = uuidv4();
        const ext = path.extname(req.file.originalname);
        const filename = `${uniqueId}${ext}`;
        const filePath = `images/${filename}`;

        // Get storage disk (default or specified)
        const diskName = req.body.disk || config.storage?.default || 'local';
        const disk = storage.disk(diskName);

        // Save file to storage
        await disk.put(filePath, req.file.buffer, {
            contentType: req.file.mimetype
        });

        // Also save to local cache for processing
        const localCachePath = path.join(UPLOAD_DIR, filename);
        await fs.writeFile(localCachePath, req.file.buffer);

        const fileInfo = {
            id: uniqueId,
            originalName: req.file.originalname,
            filename: filename,
            path: filePath,
            size: req.file.size,
            mimetype: req.file.mimetype,
            disk: diskName,
            uploadedBy: req.userId,
            uploadedAt: new Date().toISOString(),
            url: disk.url(filePath),
            urls: {
                original: `/api/image/${uniqueId}`,
                thumbnail: `/api/image/${uniqueId}/thumbnail/jpeg`,
                small: `/api/image/${uniqueId}/300x300/webp`,
                medium: `/api/image/${uniqueId}/800x800/webp`,
                large: `/api/image/${uniqueId}/1920x1080/webp`
            }
        };

        console.log('Upload successful:', fileInfo.id, 'to disk:', diskName);

        res.json({
            success: true,
            file: fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

// Görüntü silme endpoint'i - AUTH İLE KORUNMUŞ
app.delete('/api/image/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const diskName = req.query.disk || config.storage?.default || 'local';
        console.log(`Delete request for image: ${id} by user: ${req.userId}`);

        const disk = storage.disk(diskName);
        const filePath = `images/${id}*`; // Pattern matching için

        // Orijinal dosyayı bul ve sil (storage'dan)
        try {
            // Find file with this ID prefix
            const files = await fs.readdir(UPLOAD_DIR);
            const originalFile = files.find(f => f.startsWith(id));

            if (originalFile) {
                const fullPath = `images/${originalFile}`;
                if (await disk.exists(fullPath)) {
                    await disk.delete(fullPath);
                    console.log(`Deleted from storage: ${fullPath}`);
                }
            }

            // Local cache'den de sil
            if (originalFile) {
                const localPath = path.join(UPLOAD_DIR, originalFile);
                try {
                    await fs.unlink(localPath);
                    console.log(`Deleted local file: ${originalFile}`);
                } catch (err) {
                    // Ignore if file doesn't exist
                }
            }
        } catch (error) {
            console.log('File not found in storage, trying local only');
        }

        // Cache'deki tüm versiyonları sil
        try {
            const cacheFiles = await fs.readdir(CACHE_DIR);
            const relatedCacheFiles = cacheFiles.filter(f => f.startsWith(id));

            for (const cacheFile of relatedCacheFiles) {
                const cachePath = path.join(CACHE_DIR, cacheFile);
                await fs.unlink(cachePath);
                console.log(`Deleted cache file: ${cacheFile}`);
            }

            res.json({
                success: true,
                message: 'Image deleted successfully',
                deletedBy: req.userId
            });
        } catch (error) {
            res.json({
                success: true,
                message: 'Image deleted from storage',
                deletedBy: req.userId
            });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            error: 'Failed to delete image',
            message: error.message
        });
    }
});

// Tüm görüntüleri listele endpoint'i
app.get('/api/images', async (req, res) => {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const images = [];

        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            const id = path.parse(file).name;

            images.push({
                id,
                filename: file,
                size: stats.size,
                uploadedAt: stats.birthtime,
                urls: {
                    original: `/api/image/${id}`,
                    thumbnail: `/api/image/${id}/thumbnail/jpeg`,
                    small: `/api/image/${id}/300x300/webp`,
                    medium: `/api/image/${id}/800x800/webp`,
                    large: `/api/image/${id}/1920x1080/webp`
                }
            });
        }

        res.json({
            success: true,
            count: images.length,
            images
        });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({ error: 'Failed to list images' });
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
        message: `Cannot ${req.method} ${req.url}`,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
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

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});