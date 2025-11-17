# CDN Services Laravel Adapter - Kurulum Kılavuzu

Bu kılavuz, CDN Services Laravel adapter'ını Laravel projenize nasıl entegre edeceğinizi gösterir.

## 📋 Gereksinimler

- PHP >= 8.0
- Laravel >= 9.0
- CDN Services Node.js backend çalışıyor olmalı

## 🔧 Kurulum Adımları

### 1. Paketi Kopyalama

`laravel/` klasörünü Laravel projenize kopyalayın:

```bash
# Projenizin root dizininde
cp -r laravel packages/cdn-services/laravel
```

### 2. Composer Autoload Güncelleme

`composer.json` dosyanızı düzenleyin:

```json
{
    "autoload": {
        "psr-4": {
            "App\\": "app/",
            "Database\\Factories\\": "database/factories/",
            "Database\\Seeders\\": "database/seeders/",
            "CdnServices\\": "packages/cdn-services/laravel/src/"
        }
    }
}
```

Autoload'u güncelleyin:

```bash
composer dump-autoload
```

### 3. Service Provider Kaydı

`config/app.php` dosyasına Service Provider'ı ekleyin:

```php
'providers' => [
    // ...
    CdnServices\CdnServicesServiceProvider::class,
],
```

Opsiyonel olarak Facade alias'ı ekleyin:

```php
'aliases' => [
    // ...
    'CdnServices' => CdnServices\Facades\CdnServices::class,
],
```

### 4. Config Dosyasını Kopyalama

Config dosyasını `config/` dizinine kopyalayın:

```bash
cp packages/cdn-services/laravel/config/cdn-services.php config/
```

### 5. Filesystem Config Güncelleme

`config/filesystems.php` dosyasına disk ekleyin:

```php
'disks' => [
    // ...
    'cdn-services' => [
        'driver' => 'cdn-services',
        'base_url' => env('CDN_SERVICES_BASE_URL', 'http://localhost:3012'),
        'token' => env('CDN_SERVICES_TOKEN'),
        'disk' => env('CDN_SERVICES_DISK', 'local'),
        'timeout' => env('CDN_SERVICES_TIMEOUT', 30),
    ],
],
```

### 6. Environment Variables

`.env` dosyanıza ekleyin:

```env
CDN_SERVICES_BASE_URL=http://localhost:3012
CDN_SERVICES_TOKEN=your-jwt-token-here
CDN_SERVICES_DISK=local
CDN_SERVICES_DEFAULT_DISK=local
CDN_SERVICES_TIMEOUT=30
```

### 7. Token Oluşturma

CDN Services backend'inden token alın:

```bash
curl -X POST http://localhost:3012/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "email": "admin@example.com", "role": "admin"}'
```

Token'ı `.env` dosyasına ekleyin:

```env
CDN_SERVICES_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✅ Test Etme

Basit bir test yapın:

```php
// routes/web.php veya routes/api.php
use Illuminate\Support\Facades\Storage;

Route::get('/test-cdn', function () {
    try {
        // Test upload
        $testContent = 'Test file content';
        $path = Storage::disk('cdn-services')->put('test.txt', $testContent);
        
        // Test read
        $content = Storage::disk('cdn-services')->get($path);
        
        // Test exists
        $exists = Storage::disk('cdn-services')->exists($path);
        
        return response()->json([
            'success' => true,
            'path' => $path,
            'content' => $content,
            'exists' => $exists,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
});
```

Tarayıcıda veya Postman'de test edin:

```bash
curl http://localhost:8000/test-cdn
```

## 🚀 Kullanıma Hazır!

Artık Laravel Storage API'sini kullanarak CDN Services'e dosya yükleyebilirsiniz:

```php
Storage::disk('cdn-services')->put('images/photo.jpg', $fileContents);
```

Detaylı kullanım örnekleri için `laravel/README.md` dosyasına bakın.

## 🔍 Sorun Giderme

### "Class 'CdnServices\CdnServicesServiceProvider' not found"

Composer autoload'u güncelleyin:

```bash
composer dump-autoload
```

### "Connection refused" veya "cURL error"

CDN Services backend'inin çalıştığından emin olun:

```bash
curl http://localhost:3012/health
```

### "Unauthorized" Hatası

Token'ın geçerli olduğundan emin olun ve `.env` dosyasında doğru olduğunu kontrol edin.

