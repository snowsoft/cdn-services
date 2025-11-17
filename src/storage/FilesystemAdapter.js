const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Storage } = require('@google-cloud/storage');

/**
 * Laravel-style Filesystem Adapter
 * Supports multiple storage drivers: local, s3, azure, gcs
 */
class FilesystemAdapter {
    constructor(driver = 'local', config = {}) {
        this.driver = driver;
        this.config = config;
        this.client = null;
        
        this.initializeDriver();
    }

    initializeDriver() {
        switch (this.driver) {
            case 'local':
                this.client = new LocalDriver(this.config);
                break;
            case 's3':
                this.client = new S3Driver(this.config);
                break;
            case 'azure':
                this.client = new AzureDriver(this.config);
                break;
            case 'gcs':
                this.client = new GCSDriver(this.config);
                break;
            default:
                throw new Error(`Unsupported storage driver: ${this.driver}`);
        }
    }

    /**
     * Check if a file exists
     */
    async exists(filePath) {
        return await this.client.exists(filePath);
    }

    /**
     * Get the contents of a file
     */
    async get(filePath) {
        return await this.client.get(filePath);
    }

    /**
     * Write the contents of a file
     */
    async put(filePath, contents, options = {}) {
        return await this.client.put(filePath, contents, options);
    }

    /**
     * Delete a file
     */
    async delete(filePath) {
        return await this.client.delete(filePath);
    }

    /**
     * Copy a file to a new location
     */
    async copy(from, to) {
        return await this.client.copy(from, to);
    }

    /**
     * Move a file to a new location
     */
    async move(from, to) {
        await this.copy(from, to);
        await this.delete(from);
        return true;
    }

    /**
     * Get the file size
     */
    async size(filePath) {
        return await this.client.size(filePath);
    }

    /**
     * Get the file's last modification time
     */
    async lastModified(filePath) {
        return await this.client.lastModified(filePath);
    }

    /**
     * Get a file's mime type
     */
    async mimeType(filePath) {
        return await this.client.mimeType(filePath);
    }

    /**
     * Get a URL for the file
     */
    url(filePath) {
        return this.client.url(filePath);
    }

    /**
     * Get a temporary URL for the file
     */
    async temporaryUrl(filePath, expiration = 3600) {
        return await this.client.temporaryUrl(filePath, expiration);
    }
}

/**
 * Local Filesystem Driver
 */
class LocalDriver {
    constructor(config) {
        this.root = config.root || path.join(process.cwd(), 'storage');
        this.url = config.url || '/storage';
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    getFullPath(filePath) {
        return path.join(this.root, filePath);
    }

    async exists(filePath) {
        try {
            const fullPath = this.getFullPath(filePath);
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    async get(filePath) {
        const fullPath = this.getFullPath(filePath);
        return await fs.readFile(fullPath);
    }

    async put(filePath, contents, options = {}) {
        const fullPath = this.getFullPath(filePath);
        const dir = path.dirname(fullPath);
        
        await this.ensureDirectory(dir);
        
        if (Buffer.isBuffer(contents)) {
            await fs.writeFile(fullPath, contents, options);
        } else {
            await fs.writeFile(fullPath, contents, { encoding: 'utf8', ...options });
        }
        
        return true;
    }

    async delete(filePath) {
        try {
            const fullPath = this.getFullPath(filePath);
            await fs.unlink(fullPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    async copy(from, to) {
        const fromPath = this.getFullPath(from);
        const toPath = this.getFullPath(to);
        const toDir = path.dirname(toPath);
        
        await this.ensureDirectory(toDir);
        await fs.copyFile(fromPath, toPath);
        
        return true;
    }

    async size(filePath) {
        const fullPath = this.getFullPath(filePath);
        const stats = await fs.stat(fullPath);
        return stats.size;
    }

    async lastModified(filePath) {
        const fullPath = this.getFullPath(filePath);
        const stats = await fs.stat(fullPath);
        return Math.floor(stats.mtimeMs / 1000);
    }

    async mimeType(filePath) {
        // Simple mime type detection based on extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.json': 'application/json',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    url(filePath) {
        return `${this.url}/${filePath}`;
    }

    async temporaryUrl(filePath, expiration = 3600) {
        // For local storage, return regular URL
        return this.url(filePath);
    }
}

/**
 * AWS S3 Driver
 */
class S3Driver {
    constructor(config) {
        this.bucket = config.bucket;
        this.region = config.region || 'us-east-1';
        this.url = config.url;
        this.client = new S3Client({
            region: this.region,
            credentials: config.credentials ? {
                accessKeyId: config.credentials.key,
                secretAccessKey: config.credentials.secret,
            } : undefined,
        });
    }

    async exists(filePath) {
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            }));
            return true;
        } catch {
            return false;
        }
    }

    async get(filePath) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        });
        
        const response = await this.client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    }

    async put(filePath, contents, options = {}) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
            Body: Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
            ContentType: options.contentType,
            ACL: options.acl || 'public-read',
        });
        
        await this.client.send(command);
        return true;
    }

    async delete(filePath) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            });
            await this.client.send(command);
            return true;
        } catch {
            return false;
        }
    }

    async copy(from, to) {
        // S3 copy operation
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: to,
            CopySource: `${this.bucket}/${from}`,
        });
        await this.client.send(command);
        return true;
    }

    async size(filePath) {
        const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        });
        const response = await this.client.send(command);
        return response.ContentLength || 0;
    }

    async lastModified(filePath) {
        const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        });
        const response = await this.client.send(command);
        return response.LastModified ? Math.floor(response.LastModified.getTime() / 1000) : 0;
    }

    async mimeType(filePath) {
        const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        });
        const response = await this.client.send(command);
        return response.ContentType || 'application/octet-stream';
    }

    url(filePath) {
        if (this.url) {
            return `${this.url}/${filePath}`;
        }
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
    }

    async temporaryUrl(filePath, expiration = 3600) {
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        });
        return await getSignedUrl(this.client, command, { expiresIn: expiration });
    }
}

/**
 * Azure Blob Storage Driver
 */
class AzureDriver {
    constructor(config) {
        this.containerName = config.container || 'files';
        this.connectionString = config.connectionString;
        this.url = config.url;
        this.client = BlobServiceClient.fromConnectionString(this.connectionString);
        this.containerClient = this.client.getContainerClient(this.containerName);
    }

    async exists(filePath) {
        try {
            const blobClient = this.containerClient.getBlobClient(filePath);
            await blobClient.getProperties();
            return true;
        } catch {
            return false;
        }
    }

    async get(filePath) {
        const blobClient = this.containerClient.getBlobClient(filePath);
        const downloadResponse = await blobClient.download();
        const chunks = [];
        
        for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.from(chunk));
        }
        
        return Buffer.concat(chunks);
    }

    async put(filePath, contents, options = {}) {
        const blobClient = this.containerClient.getBlobClient(filePath);
        const blockBlobClient = blobClient.getBlockBlobClient();
        
        await blockBlobClient.upload(contents, Buffer.isBuffer(contents) ? contents.length : Buffer.byteLength(contents), {
            blobHTTPHeaders: {
                blobContentType: options.contentType,
            },
        });
        
        return true;
    }

    async delete(filePath) {
        try {
            const blobClient = this.containerClient.getBlobClient(filePath);
            await blobClient.delete();
            return true;
        } catch {
            return false;
        }
    }

    async copy(from, to) {
        const sourceBlob = this.containerClient.getBlobClient(from);
        const destBlob = this.containerClient.getBlobClient(to);
        await destBlob.beginCopyFromURL(sourceBlob.url);
        return true;
    }

    async size(filePath) {
        const blobClient = this.containerClient.getBlobClient(filePath);
        const properties = await blobClient.getProperties();
        return properties.contentLength || 0;
    }

    async lastModified(filePath) {
        const blobClient = this.containerClient.getBlobClient(filePath);
        const properties = await blobClient.getProperties();
        return properties.lastModified ? Math.floor(properties.lastModified.getTime() / 1000) : 0;
    }

    async mimeType(filePath) {
        const blobClient = this.containerClient.getBlobClient(filePath);
        const properties = await blobClient.getProperties();
        return properties.contentType || 'application/octet-stream';
    }

    url(filePath) {
        if (this.url) {
            return `${this.url}/${filePath}`;
        }
        const blobClient = this.containerClient.getBlobClient(filePath);
        return blobClient.url;
    }

    async temporaryUrl(filePath, expiration = 3600) {
        const blobClient = this.containerClient.getBlobClient(filePath);
        const sasUrl = await blobClient.generateSasUrl({
            permissions: 'r',
            expiresOn: new Date(Date.now() + expiration * 1000),
        });
        return sasUrl;
    }
}

/**
 * Google Cloud Storage Driver
 */
class GCSDriver {
    constructor(config) {
        this.bucketName = config.bucket;
        this.projectId = config.projectId;
        this.keyFilename = config.keyFilename;
        this.url = config.url;
        
        this.storage = new Storage({
            projectId: this.projectId,
            keyFilename: this.keyFilename,
        });
        
        this.bucket = this.storage.bucket(this.bucketName);
    }

    async exists(filePath) {
        const file = this.bucket.file(filePath);
        const [exists] = await file.exists();
        return exists;
    }

    async get(filePath) {
        const file = this.bucket.file(filePath);
        const [buffer] = await file.download();
        return buffer;
    }

    async put(filePath, contents, options = {}) {
        const file = this.bucket.file(filePath);
        await file.save(contents, {
            metadata: {
                contentType: options.contentType,
            },
        });
        return true;
    }

    async delete(filePath) {
        try {
            const file = this.bucket.file(filePath);
            await file.delete();
            return true;
        } catch {
            return false;
        }
    }

    async copy(from, to) {
        const sourceFile = this.bucket.file(from);
        const destFile = this.bucket.file(to);
        await sourceFile.copy(destFile);
        return true;
    }

    async size(filePath) {
        const file = this.bucket.file(filePath);
        const [metadata] = await file.getMetadata();
        return parseInt(metadata.size) || 0;
    }

    async lastModified(filePath) {
        const file = this.bucket.file(filePath);
        const [metadata] = await file.getMetadata();
        const time = new Date(metadata.updated).getTime();
        return Math.floor(time / 1000);
    }

    async mimeType(filePath) {
        const file = this.bucket.file(filePath);
        const [metadata] = await file.getMetadata();
        return metadata.contentType || 'application/octet-stream';
    }

    url(filePath) {
        if (this.url) {
            return `${this.url}/${filePath}`;
        }
        return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
    }

    async temporaryUrl(filePath, expiration = 3600) {
        const file = this.bucket.file(filePath);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiration * 1000,
        });
        return url;
    }
}

module.exports = FilesystemAdapter;

