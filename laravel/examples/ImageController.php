<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

/**
 * Example Image Controller
 * 
 * This controller demonstrates how to use CDN Services adapter
 * in a Laravel application
 */
class ImageController extends Controller
{
    /**
     * Upload an image
     */
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|max:51200', // 50MB
            'disk' => 'nullable|in:local,s3,azure,gcs',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $file = $request->file('image');
            $disk = $request->input('disk', 'local');
            
            // Upload to CDN Services
            $path = Storage::disk('cdn-services')->put('images', $file, [
                'disk' => $disk,
            ]);
            
            $url = Storage::disk('cdn-services')->url($path);
            
            return response()->json([
                'success' => true,
                'path' => $path,
                'url' => $url,
                'disk' => $disk,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get image by ID
     */
    public function show($id)
    {
        try {
            if (!Storage::disk('cdn-services')->exists($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Image not found',
                ], 404);
            }

            $contents = Storage::disk('cdn-services')->get($id);
            $mimeType = Storage::disk('cdn-services')->mimeType($id);
            $size = Storage::disk('cdn-services')->size($id);
            $lastModified = Storage::disk('cdn-services')->lastModified($id);

            return response($contents)
                ->header('Content-Type', $mimeType)
                ->header('Content-Length', $size)
                ->header('Last-Modified', gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve image: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an image
     */
    public function delete($id, Request $request)
    {
        try {
            $disk = $request->input('disk', 'local');
            
            if (!Storage::disk('cdn-services')->exists($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Image not found',
                ], 404);
            }

            Storage::disk('cdn-services')->delete($id);

            return response()->json([
                'success' => true,
                'message' => 'Image deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete image: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * List all images
     */
    public function index()
    {
        try {
            $files = Storage::disk('cdn-services')->files();
            
            $images = [];
            foreach ($files as $file) {
                $images[] = [
                    'id' => $file,
                    'url' => Storage::disk('cdn-services')->url($file),
                    'size' => Storage::disk('cdn-services')->size($file),
                    'lastModified' => Storage::disk('cdn-services')->lastModified($file),
                ];
            }

            return response()->json([
                'success' => true,
                'count' => count($images),
                'images' => $images,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to list images: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get image info
     */
    public function info($id)
    {
        try {
            if (!Storage::disk('cdn-services')->exists($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Image not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'id' => $id,
                'url' => Storage::disk('cdn-services')->url($id),
                'size' => Storage::disk('cdn-services')->size($id),
                'mimeType' => Storage::disk('cdn-services')->mimeType($id),
                'lastModified' => Storage::disk('cdn-services')->lastModified($id),
                'processedUrls' => [
                    'thumbnail' => config('cdn-services.base_url') . "/api/image/{$id}/thumbnail/jpeg",
                    'small' => config('cdn-services.base_url') . "/api/image/{$id}/300x300/webp",
                    'medium' => config('cdn-services.base_url') . "/api/image/{$id}/800x800/webp",
                    'large' => config('cdn-services.base_url') . "/api/image/{$id}/1920x1080/webp",
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get image info: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Copy an image
     */
    public function copy(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'destination' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            if (!Storage::disk('cdn-services')->exists($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Source image not found',
                ], 404);
            }

            $copied = Storage::disk('cdn-services')->copy($id, $request->input('destination'));

            if ($copied) {
                return response()->json([
                    'success' => true,
                    'message' => 'Image copied successfully',
                    'destination' => $request->input('destination'),
                    'url' => Storage::disk('cdn-services')->url($request->input('destination')),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to copy image',
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to copy image: ' . $e->getMessage(),
            ], 500);
        }
    }
}

