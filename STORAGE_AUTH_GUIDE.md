# Storage ve Authentication Kullanım Kılavuzu

Bu dokümantasyon, CDN Services'e eklenen Laravel-style filesystem adapter ve JWT authentication özelliklerinin kullanımını açıklar.

## 📦 Kurulum

Gerekli paketleri yükleyin:

```bash
npm install
```

## 🔐 Authentication

### JWT Token Oluşturma

Test için token oluşturma endpoint'i:

```bash
POST /api/auth/token
Content-Type: application/json

{
  "userId": "123",
  "email": "user@example.com",
  "role": "user"
}
```

Yanıt:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": "7d",
  "user": {
    "id": "123",
    "userId": "123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Authenticated Request Gönderme

Tüm korumalı endpoint'lere istek gönderirken Authorization header'ında token gönderin:

```bash
Authorization: Bearer <your-token>
```

Örnek:
```bash
curl -X POST http://localhost:3012/api/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "image=@photo.jpg"
```

## 💾 Storage Adapter Kullanımı

### Storage Disk Yapılandırması

`.env` dosyasında storage ayarlarını yapılandırın:

```env
# Default storage disk
STORAGE_DEFAULT=local

# Local Storage
STORAGE_LOCAL_ROOT=storage
STORAGE_LOCAL_URL=/storage

# AWS S3 Storage
STORAGE_S3_BUCKET=my-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_URL=https://my-bucket.s3.amazonaws.com
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Azure Blob Storage
STORAGE_AZURE_CONTAINER=files
STORAGE_AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
STORAGE_AZURE_URL=https://youraccount.blob.core.windows.net

# Google Cloud Storage
STORAGE_GCS_BUCKET=my-bucket
STORAGE_GCS_PROJECT_ID=my-project
STORAGE_GCS_KEY_FILENAME=/path/to/keyfile.json
STORAGE_GCS_URL=https://storage.googleapis.com/my-bucket
```

### Storage Kullanımı

#### Kod İçinde Kullanım

```javascript
const storage = require('./src/storage/StorageManager');

// Default disk kullanımı
const disk = storage.disk();
await disk.put('images/photo.jpg', buffer);
const file = await disk.get('images/photo.jpg');

// Belirli bir disk kullanımı
const s3Disk = storage.disk('s3');
await s3Disk.put('images/photo.jpg', buffer);

// Storage facade kullanımı (Laravel-style)
const Storage = require('./src/storage');
await Storage.put('images/photo.jpg', buffer);
const url = Storage.url('images/photo.jpg');
```

#### Upload Endpoint'inde Disk Seçimi

Upload sırasında disk belirtebilirsiniz:

```bash
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <file>
disk: s3  # opsiyonel, default: local
```

## 📤 Upload Endpoint

### Authenticated Upload

```bash
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <file>
disk: s3  # opsiyonel
```

Yanıt:
```json
{
  "success": true,
  "file": {
    "id": "uuid-here",
    "originalName": "photo.jpg",
    "filename": "uuid-here.jpg",
    "path": "images/uuid-here.jpg",
    "size": 123456,
    "mimetype": "image/jpeg",
    "disk": "s3",
    "uploadedBy": "123",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "url": "https://my-bucket.s3.amazonaws.com/images/uuid-here.jpg",
    "urls": {
      "original": "/api/image/uuid-here",
      "thumbnail": "/api/image/uuid-here/thumbnail/jpeg",
      "small": "/api/image/uuid-here/300x300/webp",
      "medium": "/api/image/uuid-here/800x800/webp",
      "large": "/api/image/uuid-here/1920x1080/webp"
    }
  }
}
```

## 🗑️ Delete Endpoint

### Authenticated Delete

```bash
DELETE /api/image/:id?disk=s3
Authorization: Bearer <token>
```

## 🔧 Storage Adapter Metodları

### Temel İşlemler

```javascript
// Dosya var mı kontrol et
const exists = await disk.exists('path/to/file.jpg');

// Dosya içeriğini al
const content = await disk.get('path/to/file.jpg');

// Dosya kaydet
await disk.put('path/to/file.jpg', buffer, {
  contentType: 'image/jpeg'
});

// Dosya sil
await disk.delete('path/to/file.jpg');

// Dosya kopyala
await disk.copy('path/to/source.jpg', 'path/to/destination.jpg');

// Dosya taşı
await disk.move('path/to/source.jpg', 'path/to/destination.jpg');
```

### Metadata İşlemleri

```javascript
// Dosya boyutu
const size = await disk.size('path/to/file.jpg');

// Son değiştirilme zamanı (Unix timestamp)
const lastModified = await disk.lastModified('path/to/file.jpg');

// MIME type
const mimeType = await disk.mimeType('path/to/file.jpg');
```

### URL İşlemleri

```javascript
// Public URL
const url = disk.url('path/to/file.jpg');

// Geçici URL (signed URL, S3/Azure/GCS için)
const tempUrl = await disk.temporaryUrl('path/to/file.jpg', 3600); // 1 saat
```

## 🛡️ Middleware Kullanımı

### Authentication Middleware

```javascript
const { authenticate, optionalAuth, authorize } = require('./src/middleware/auth');

// Zorunlu authentication
app.post('/api/upload', authenticate, uploadHandler);

// Opsiyonel authentication (token varsa kullanıcı bilgisi eklenir)
app.get('/api/images', optionalAuth, listHandler);

// Role-based authorization
app.delete('/api/admin/images/:id', authenticate, authorize('admin'), deleteHandler);
```

## 📝 Örnek Kullanım Senaryoları

### Senaryo 1: Local Storage ile Upload

```bash
# 1. Token al
curl -X POST http://localhost:3012/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "email": "user@example.com"}'

# 2. Dosya yükle
curl -X POST http://localhost:3012/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg"
```

### Senaryo 2: S3 Storage ile Upload

```bash
# .env dosyasında S3 ayarlarını yapılandırın, sonra:
curl -X POST http://localhost:3012/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg" \
  -F "disk=s3"
```

### Senaryo 3: Kod İçinde Storage Kullanımı

```javascript
const storage = require('./src/storage/StorageManager');
const sharp = require('sharp');

// Görüntüyü işle ve farklı disk'lere kaydet
async function processAndStore(imageBuffer) {
  const disk = storage.disk('local');
  const s3Disk = storage.disk('s3');
  
  // Orijinali local'e kaydet
  await disk.put('images/original.jpg', imageBuffer);
  
  // Thumbnail oluştur ve S3'e kaydet
  const thumbnail = await sharp(imageBuffer)
    .resize(200, 200)
    .toBuffer();
  await s3Disk.put('thumbnails/thumb.jpg', thumbnail);
  
  return {
    original: disk.url('images/original.jpg'),
    thumbnail: s3Disk.url('thumbnails/thumb.jpg')
  };
}
```

## 🔒 Güvenlik Notları

1. **JWT Secret**: Production'da mutlaka güçlü bir `JWT_SECRET` kullanın
2. **Token Expiry**: Token süresini uygun şekilde ayarlayın (`JWT_EXPIRE`)
3. **HTTPS**: Production'da mutlaka HTTPS kullanın
4. **Storage Credentials**: Cloud storage credentials'ları güvenli şekilde saklayın
5. **File Validation**: Upload edilen dosyaları her zaman validate edin

## 🐛 Troubleshooting

### "Storage disk is not configured" Hatası

`.env` dosyasında ilgili storage disk'inin yapılandırıldığından emin olun.

### "Unauthorized" Hatası

Token'ın geçerli olduğundan ve `Authorization: Bearer <token>` formatında gönderildiğinden emin olun.

### S3/Azure/GCS Bağlantı Hataları

Credentials'ların doğru olduğundan ve gerekli izinlerin verildiğinden emin olun.

