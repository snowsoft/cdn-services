<?php

namespace CdnServices\Adapters;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Contracts\Filesystem\Cloud;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * CDN Services Filesystem Adapter
 * 
 * Laravel Storage driver for CDN Services Node.js backend
 */
class CdnServicesFilesystemAdapter implements Filesystem, Cloud
{
    protected $config;
    protected $baseUrl;
    protected $token;
    protected $disk;

    public function __construct(array $config)
    {
        $this->config = $config;
        $this->baseUrl = rtrim($config['base_url'] ?? 'http://localhost:3012', '/');
        $this->token = $config['token'] ?? null;
        $this->disk = $config['disk'] ?? 'local';
    }

    /**
     * Check if a file exists
     */
    public function exists($path): bool
    {
        try {
            $response = $this->makeRequest('get', "/api/info/{$this->extractId($path)}");
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get the contents of a file
     */
    public function get($path): ?string
    {
        try {
            $id = $this->extractId($path);
            $response = $this->makeRequest('get', "/api/image/{$id}");
            
            if ($response->successful()) {
                return $response->body();
            }
            
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Write the contents of a file
     */
    public function put($path, $contents, $options = []): bool
    {
        try {
            // If contents is a file path, read it
            if (is_string($contents) && file_exists($contents)) {
                $contents = file_get_contents($contents);
            }

            // Create a temporary file for upload
            $tempFile = tmpfile();
            $tempPath = stream_get_meta_data($tempFile)['uri'];
            file_put_contents($tempPath, $contents);

            // Upload to CDN Services
            $response = $this->makeRequest('post', '/api/upload', [
                'multipart' => [
                    [
                        'name' => 'image',
                        'contents' => fopen($tempPath, 'r'),
                        'filename' => basename($path),
                    ],
                    [
                        'name' => 'disk',
                        'contents' => $this->disk,
                    ],
                ],
            ]);

            fclose($tempFile);

            if ($response->successful()) {
                $data = $response->json();
                // Store the mapping if needed (path => id)
                return isset($data['file']['id']);
            }

            return false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Delete a file
     */
    public function delete($path): bool
    {
        try {
            $id = $this->extractId($path);
            $response = $this->makeRequest('delete', "/api/image/{$id}?disk={$this->disk}");
            
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Copy a file to a new location
     */
    public function copy($from, $to): bool
    {
        $contents = $this->get($from);
        
        if ($contents === null) {
            return false;
        }
        
        return $this->put($to, $contents);
    }

    /**
     * Move a file to a new location
     */
    public function move($from, $to): bool
    {
        if ($this->copy($from, $to)) {
            return $this->delete($from);
        }
        
        return false;
    }

    /**
     * Get the file size
     */
    public function size($path): int
    {
        try {
            $id = $this->extractId($path);
            $response = $this->makeRequest('get', "/api/info/{$id}");
            
            if ($response->successful()) {
                $data = $response->json();
                return $data['size'] ?? 0;
            }
            
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get the file's last modification time
     */
    public function lastModified($path): int
    {
        try {
            $id = $this->extractId($path);
            $response = $this->makeRequest('get', "/api/info/{$id}");
            
            if ($response->successful()) {
                $data = $response->json();
                $uploadedAt = $data['uploadedAt'] ?? null;
                
                if ($uploadedAt) {
                    return strtotime($uploadedAt);
                }
            }
            
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get a file's mime type
     */
    public function mimeType($path): ?string
    {
        try {
            $id = $this->extractId($path);
            $response = $this->makeRequest('get', "/api/info/{$id}");
            
            if ($response->successful()) {
                $data = $response->json();
                return $data['metadata']['format'] ?? null;
            }
            
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get a URL for the file
     */
    public function url($path): string
    {
        $id = $this->extractId($path);
        return "{$this->baseUrl}/api/image/{$id}";
    }

    /**
     * Get a temporary URL for the file
     */
    public function temporaryUrl($path, $expiration = null, array $options = []): string
    {
        // CDN Services doesn't have temporary URLs yet, return regular URL
        return $this->url($path);
    }

    /**
     * Get a resource to read the file
     */
    public function readStream($path)
    {
        $contents = $this->get($path);
        
        if ($contents === null) {
            return null;
        }
        
        $resource = fopen('php://temp', 'r+');
        fwrite($resource, $contents);
        rewind($resource);
        
        return $resource;
    }

    /**
     * Write a new file using a stream
     */
    public function writeStream($path, $resource, array $options = []): bool
    {
        $contents = stream_get_contents($resource);
        return $this->put($path, $contents, $options);
    }

    /**
     * Get all files in a directory
     */
    public function files($directory = null, $recursive = false): array
    {
        try {
            $response = $this->makeRequest('get', '/api/images');
            
            if ($response->successful()) {
                $data = $response->json();
                $files = [];
                
                foreach ($data['images'] ?? [] as $image) {
                    $files[] = $image['id'];
                }
                
                return $files;
            }
            
            return [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get all directories within a directory
     */
    public function directories($directory = null, $recursive = false): array
    {
        // CDN Services doesn't support directories yet
        return [];
    }

    /**
     * Create a directory
     */
    public function makeDirectory($path): bool
    {
        // CDN Services doesn't support directories yet
        return true;
    }

    /**
     * Recursively delete a directory
     */
    public function deleteDirectory($directory): bool
    {
        // CDN Services doesn't support directories yet
        return true;
    }

    /**
     * Make HTTP request with authentication
     */
    protected function makeRequest(string $method, string $endpoint, array $options = [])
    {
        $url = $this->baseUrl . $endpoint;
        $request = Http::timeout($this->config['timeout'] ?? 30);
        
        // Add authentication token if available
        if ($this->token) {
            $request = $request->withToken($this->token);
        }
        
        // Handle multipart uploads
        if (isset($options['multipart'])) {
            return $request->asMultipart()->send($method, $url, $options);
        }
        
        return $request->send($method, $url, $options);
    }

    /**
     * Extract ID from path
     * If path is already an ID, return it. Otherwise, try to extract from path.
     */
    protected function extractId(string $path): string
    {
        // If path looks like an ID (UUID format), return as is
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $path)) {
            return $path;
        }
        
        // Try to extract ID from path (e.g., "images/uuid.jpg" -> "uuid")
        $basename = basename($path);
        $id = pathinfo($basename, PATHINFO_FILENAME);
        
        return $id;
    }
}

