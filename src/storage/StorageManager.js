const FilesystemAdapter = require('./FilesystemAdapter');
const config = require('../config');

/**
 * Storage Manager
 * Manages multiple filesystem adapters (similar to Laravel's Storage facade)
 */
class StorageManager {
    constructor() {
        this.disks = {};
        this.defaultDisk = config.storage?.default || 'local';
        this.initializeDisks();
    }

    /**
     * Initialize configured storage disks
     */
    initializeDisks() {
        const disks = config.storage?.disks || {};
        
        for (const [name, diskConfig] of Object.entries(disks)) {
            this.disks[name] = new FilesystemAdapter(
                diskConfig.driver,
                diskConfig.config || {}
            );
        }

        // Ensure default disk exists
        if (!this.disks[this.defaultDisk]) {
            this.disks[this.defaultDisk] = new FilesystemAdapter('local', {
                root: config.storage?.local?.root || 'storage',
                url: config.storage?.local?.url || '/storage',
            });
        }
    }

    /**
     * Get a disk instance
     */
    disk(name = null) {
        const diskName = name || this.defaultDisk;
        
        if (!this.disks[diskName]) {
            throw new Error(`Storage disk "${diskName}" is not configured`);
        }
        
        return this.disks[diskName];
    }

    /**
     * Create a new disk instance dynamically
     */
    createDisk(driver, config) {
        return new FilesystemAdapter(driver, config);
    }
}

// Export singleton instance
module.exports = new StorageManager();

