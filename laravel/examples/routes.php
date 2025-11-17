<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ImageController;

/*
|--------------------------------------------------------------------------
| CDN Services Example Routes
|--------------------------------------------------------------------------
|
| Example routes for using CDN Services adapter in Laravel
|
*/

// Public routes
Route::get('/images', [ImageController::class, 'index']);
Route::get('/images/{id}', [ImageController::class, 'show']);
Route::get('/images/{id}/info', [ImageController::class, 'info']);

// Protected routes (add auth middleware as needed)
Route::middleware(['auth'])->group(function () {
    Route::post('/images/upload', [ImageController::class, 'upload']);
    Route::delete('/images/{id}', [ImageController::class, 'delete']);
    Route::post('/images/{id}/copy', [ImageController::class, 'copy']);
});

