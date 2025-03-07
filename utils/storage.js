const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
// Determine which key to use based on configuration
const useServiceRole = process.env.USE_SERVICE_ROLE === 'true';
const supabaseKey = useServiceRole ? process.env.SUPABASE_SERVICE_KEY : process.env.SUPABASE_ANON_KEY;

console.log('Initializing Supabase with URL:', supabaseUrl);
console.log('Using service role key:', useServiceRole);
console.log('Supabase Key starts with:', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'undefined');

// Create Supabase client with explicit configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        fetch: (url, options = {}) => {
            // Add apikey header to all requests
            const headers = {
                ...options.headers,
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            };
            
            // Log request details for debugging
            console.log(`Making Supabase request to: ${url}`);
            console.log('Request headers:', headers);
            
            return fetch(url, { ...options, headers });
        }
    }
});

// Verify connection
async function verifyConnection() {
    try {
        console.log('Verifying Supabase connection...');
        
        // Check if we can access storage
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('Failed to list buckets:', bucketsError);
            return false;
        }
        
        console.log('Available buckets:', buckets.map(b => b.name));
        
        // Check if our bucket exists
        const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'delivery-attachments';
        const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
        
        if (!bucketExists) {
            console.error(`Bucket ${BUCKET_NAME} not found in available buckets`);
            
            // If we're using service role key, try to create the bucket
            if (useServiceRole) {
                console.log(`Attempting to create bucket ${BUCKET_NAME}...`);
                const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
                    public: true
                });
                
                if (error) {
                    console.error('Failed to create bucket:', error);
                    return false;
                }
                
                console.log('Bucket created successfully');
                return true;
            }
            
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to verify Supabase connection:', error);
        return false;
    }
}

// Storage configuration
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'delivery-attachments';
console.log('Using storage bucket:', BUCKET_NAME);

// Feature flag for storage service
const STORAGE_SERVICE = process.env.STORAGE_SERVICE || 'supabase'; // 'supabase' or 'airtable'

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadToSupabase(fileBuffer, fileName, contentType) {
    try {
        // Verify connection before upload
        const isConnected = await verifyConnection();
        if (!isConnected) {
            throw new Error('Failed to verify Supabase connection');
        }

        console.log(`Attempting to upload file: ${fileName} (${contentType})`);
        console.log('File size:', fileBuffer.length, 'bytes');
        
        // Sanitize filename to avoid issues with special characters
        const sanitizedName = sanitizeFileName(fileName);
        
        // Generate a unique file name with timestamp and random string
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 6);
        const uniqueFileName = `${timestamp}-${randomString}-${sanitizedName}`;
        
        console.log('Generated unique filename:', uniqueFileName);

        // Upload file to Supabase
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(uniqueFileName, fileBuffer, {
                contentType,
                upsert: true, // Use upsert in case the file already exists
                cacheControl: '3600'
            });

        if (error) {
            console.error('Supabase upload error:', error);
            console.error('Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                name: error.name,
                details: error.details
            });
            throw error;
        }

        console.log('File uploaded successfully:', data);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(uniqueFileName);

        console.log('Generated public URL:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Supabase upload error:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

/**
 * Sanitize file name to avoid issues with special characters
 * @param {string} fileName - Original file name
 * @returns {string} Sanitized file name
 */
function sanitizeFileName(fileName) {
    // Replace special characters that could cause issues
    return fileName
        .replace(/[^\w\s.-]/g, '') // Remove any character that's not word, space, dot, or hyphen
        .replace(/\s+/g, '_')      // Replace spaces with underscores
        .replace(/__+/g, '_')      // Replace multiple underscores with a single one
        .trim();
}

/**
 * Upload multiple files and return their URLs
 * @param {Array<{buffer: Buffer, originalname: string, mimetype: string}>} files - Array of file objects
 * @returns {Promise<Array<string>>} Array of public URLs
 */
async function uploadMultipleFiles(files) {
    try {
        const uploadPromises = files.map(file => 
            uploadToSupabase(file.buffer, file.originalname, file.mimetype)
        );
        
        const urls = await Promise.all(uploadPromises);
        return urls;
    } catch (error) {
        console.error('Multiple files upload error:', error);
        throw error;
    }
}

/**
 * Delete file from Supabase Storage using direct API call
 * @param {string} fileUrl - Public URL of the file to delete
 * @returns {Promise<any>} Result from deletion operation
 */
async function deleteFile(fileUrl) {
    try {
        console.log('Attempting to delete file:', fileUrl);
        
        // Extract file path from URL
        // URLs look like: https://[project-ref].supabase.co/storage/v1/object/public/delivery-attachments/filename.jpg
        const urlParts = fileUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        console.log('Extracted filename:', filename);
        
        if (!filename) {
            throw new Error('Could not extract filename from URL');
        }
        
        // Use direct fetch API instead of Supabase SDK
        const apiUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${encodeURIComponent(filename)}`;
        console.log('Using API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            }
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('File deletion HTTP error:', response.status, errorBody);
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
        }
        
        console.log('File deleted successfully, status:', response.status);
        return true;
    } catch (error) {
        console.error('File deletion error:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

module.exports = {
    uploadToSupabase,
    uploadMultipleFiles,
    deleteFile,
    supabase, // Export supabase client for database operations
    STORAGE_SERVICE
}; 