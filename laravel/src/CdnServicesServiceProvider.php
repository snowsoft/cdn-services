<?php

namespace CdnServices;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Storage;
use CdnServices\Adapters\CdnServicesFilesystemAdapter;

class CdnServicesServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        // Merge config
        $this->mergeConfigFrom(
            __DIR__ . '/../config/cdn-services.php',
            'cdn-services'
        );
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        // Publish config
        $this->publishes([
            __DIR__ . '/../config/cdn-services.php' => config_path('cdn-services.php'),
        ], 'cdn-services-config');

        // Extend Laravel's Storage with CDN Services driver
        Storage::extend('cdn-services', function ($app, $config) {
            return new CdnServicesFilesystemAdapter($config);
        });
    }
}

