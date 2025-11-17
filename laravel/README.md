# CDN Services Laravel Adapter

Laravel Storage adapter for CDN Services Node.js backend. This package allows you to use CDN Services as a Laravel filesystem disk.

## 📦 Kurulum

### Composer ile Kurulum

```bash
composer require cdn-services/laravel-adapter
```

### Manuel Kurulum

1. `laravel/` klasörünü Laravel projenizin `packages/` veya `vendor/` dizinine kopyalayın.

2. `composer.json` dosyanıza ekleyin:

```json
{
    "autoload": {
        "psr-4": {
            "CdnServices\\": "packages/cdn-services/laravel/src/"
        }
    }
}
```

3. `config/app.php` dosyasına Service Provider'ı ekleyin:

```php
'providers' => [
    // ...
    CdnServices\CdnServicesServiceProvider::class,
],
```

4. Config dosyasını yayınlayın:

```bash
php artisan vendor:publish --tag=cdn-services-config
```

## ⚙️ Yapılandırma

### Environment Variables

`.env` dosyanıza ekleyin:

```env
CDN_SERVICES_BASE_URL=http://localhost:3012
CDN_SERVICES_TOKEN=your-jwt-token-here
CDN_SERVICES_DISK=local
CDN_SERVICES_DEFAULT_DISK=local
CDN_SERVICES_TIMEOUT=30
```

### Filesystem Config

`config/filesystems.php` dosyasına disk ekleyin:

```php
'disks' => [
    // ...
    'cdn-services' => [
        'driver' => 'cdn-services',
        'base_url' => env('CDN_SERVICES_BASE_URL', 'http://localhost:3012'),
        'token' => env('CDN_SERVICES_TOKEN'),
        'disk' => env('CDN_SERVICES_DISK', 'local'),
    ],
],
```

## 🚀 Kullanım

### Storage Facade ile Kullanım

```php
use Illuminate\Support\Facades\Storage;

// Dosya yükle
Storage::disk('cdn-services')->put('images/photo.jpg', $fileContents);

// Dosya oku
$contents = Storage::disk('cdn-services')->get('images/photo.jpg');

// Dosya var mı kontrol et
if (Storage::disk('cdn-services')->exists('images/photo.jpg')) {
    // ...
}

// Dosya sil
Storage::disk('cdn-services')->delete('images/photo.jpg');

// Dosya URL'i al
$url = Storage::disk('cdn-services')->url('images/photo.jpg');

// Dosya kopyala
Storage::disk('cdn-services')->copy('images/photo.jpg', 'images/photo-copy.jpg');

// Dosya taşı
Storage::disk('cdn-services')->move('images/photo.jpg', 'images/new-photo.jpg');
```

### CdnServices Facade ile Kullanım

```php
use CdnServices\Facades\CdnServices;

// Dosya yükle
CdnServices::put('images/photo.jpg', $fileContents);

// Dosya oku
$contents = CdnServices::get('images/photo.jpg');

// Dosya URL'i al
$url = CdnServices::url('images/photo.jpg');
```

### UploadedFile ile Kullanım

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

public function upload(Request $request)
{
    $request->validate([
        'image' => 'required|image|max:51200', // 50MB
    ]);

    $file = $request->file('image');
    $path = Storage::disk('cdn-services')->put('images', $file);
    
    $url = Storage::disk('cdn-services')->url($path);
    
    return response()->json([
        'success' => true,
        'path' => $path,
        'url' => $url,
    ]);
}
```

### Farklı Disk Kullanımı

```php
// S3 disk'e yükle
Storage::disk('cdn-services')->put('images/photo.jpg', $fileContents, [
    'disk' => 's3'
]);

// Azure disk'e yükle
Storage::disk('cdn-services')->put('images/photo.jpg', $fileContents, [
    'disk' => 'azure'
]);
```

### Image Processing ile Kullanım

CDN Services otomatik olarak görüntü işleme yapar. Farklı boyutlarda görüntü almak için:

```php
// Orijinal görüntü URL'i
$originalUrl = Storage::disk('cdn-services')->url('image-id');

// Thumbnail URL'i (CDN Services endpoint'i kullanarak)
$thumbnailUrl = 'http://localhost:3012/api/image/image-id/thumbnail/jpeg';

// Özel boyut URL'i
$customSizeUrl = 'http://localhost:3012/api/image/image-id/800x600/webp';
```

## 📝 Örnek Controller

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:51200',
        ]);

        $file = $request->file('image');
        $path = Storage::disk('cdn-services')->put('images', $file);
        
        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => Storage::disk('cdn-services')->url($path),
        ]);
    }

    public function show($id)
    {
        if (!Storage::disk('cdn-services')->exists($id)) {
            abort(404);
        }

        $contents = Storage::disk('cdn-services')->get($id);
        $mimeType = Storage::disk('cdn-services')->mimeType($id);

        return response($contents)
            ->header('Content-Type', $mimeType);
    }

    public function delete($id)
    {
        Storage::disk('cdn-services')->delete($id);

        return response()->json([
            'success' => true,
            'message' => 'Image deleted successfully',
        ]);
    }
}
```

## 🔧 Özelleştirme

### Custom Base URL

```php
// config/filesystems.php
'cdn-services' => [
    'driver' => 'cdn-services',
    'base_url' => 'https://cdn.example.com',
    'token' => env('CDN_SERVICES_TOKEN'),
    'disk' => 's3',
],
```

### Token Yönetimi

Token'ı dinamik olarak ayarlamak için:

```php
// Service Provider'da
public function boot()
{
    Storage::extend('cdn-services', function ($app, $config) {
        $adapter = new CdnServicesFilesystemAdapter($config);
        
        // Token'ı dinamik olarak ayarla
        if (auth()->check()) {
            $adapter->setToken(auth()->user()->cdn_token);
        }
        
        return $adapter;
    });
}
```

## 🐛 Troubleshooting

### "Connection refused" Hatası

CDN Services backend'inin çalıştığından emin olun:

```bash
curl http://localhost:3012/health
```

### "Unauthorized" Hatası

Token'ın geçerli olduğundan emin olun. Token'ı yeniden oluşturun:

```bash
curl -X POST http://localhost:3012/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "email": "user@example.com"}'
```

### Dosya Bulunamadı Hatası

CDN Services'te dosya ID'sinin doğru olduğundan emin olun. Path yerine ID kullanın.

## 📚 API Referansı

### Mevcut Metodlar

- `exists($path)` - Dosya var mı kontrol et
- `get($path)` - Dosya içeriğini al
- `put($path, $contents, $options)` - Dosya kaydet
- `delete($path)` - Dosya sil
- `copy($from, $to)` - Dosya kopyala
- `move($from, $to)` - Dosya taşı
- `size($path)` - Dosya boyutu
- `lastModified($path)` - Son değiştirilme zamanı
- `mimeType($path)` - MIME type
- `url($path)` - Public URL
- `temporaryUrl($path, $expiration)` - Geçici URL
- `readStream($path)` - Stream oku
- `writeStream($path, $resource)` - Stream yaz
- `files($directory)` - Dosyaları listele

## 📄 Lisans

MIT License

