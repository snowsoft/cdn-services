<?php

namespace CdnServices\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * CDN Services Facade
 * 
 * @method static bool exists(string $path)
 * @method static string|null get(string $path)
 * @method static bool put(string $path, $contents, array $options = [])
 * @method static bool delete(string $path)
 * @method static bool copy(string $from, string $to)
 * @method static bool move(string $from, string $to)
 * @method static int size(string $path)
 * @method static int lastModified(string $path)
 * @method static string|null mimeType(string $path)
 * @method static string url(string $path)
 * @method static string temporaryUrl(string $path, $expiration = null, array $options = [])
 * @method static resource|null readStream(string $path)
 * @method static bool writeStream(string $path, $resource, array $options = [])
 * @method static array files(string $directory = null, bool $recursive = false)
 * @method static array directories(string $directory = null, bool $recursive = false)
 * @method static bool makeDirectory(string $path)
 * @method static bool deleteDirectory(string $directory)
 */
class CdnServices extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor()
    {
        return 'cdn-services';
    }
}

