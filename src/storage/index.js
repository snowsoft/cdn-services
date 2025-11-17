/**
 * Storage Facade
 * Laravel-style Storage facade for easy access
 * 
 * Usage:
 * const storage = require('./storage');
 * await storage.put('path/to/file.jpg', buffer);
 * const file = await storage.get('path/to/file.jpg');
 */
const StorageManager = require('./StorageManager');

// Export the default disk methods directly for convenience
module.exports = {
    // Get a specific disk
    disk: (name) => StorageManager.disk(name),
    
    // Default disk operations
    exists: (path) => StorageManager.disk().exists(path),
    get: (path) => StorageManager.disk().get(path),
    put: (path, contents, options) => StorageManager.disk().put(path, contents, options),
    delete: (path) => StorageManager.disk().delete(path),
    copy: (from, to) => StorageManager.disk().copy(from, to),
    move: (from, to) => StorageManager.disk().move(from, to),
    size: (path) => StorageManager.disk().size(path),
    lastModified: (path) => StorageManager.disk().lastModified(path),
    mimeType: (path) => StorageManager.disk().mimeType(path),
    url: (path) => StorageManager.disk().url(path),
    temporaryUrl: (path, expiration) => StorageManager.disk().temporaryUrl(path, expiration),
    
    // Access to manager
    manager: StorageManager,
};

