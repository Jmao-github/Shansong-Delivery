// Load environment variables
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'delivery-attachments';

console.log('Testing Supabase upload with:');
console.log('URL:', supabaseUrl);
console.log('Bucket:', bucketName);

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    try {
        // Create a small test file
        const testFileContent = 'This is a test file for Supabase storage upload.';
        const testBuffer = Buffer.from(testFileContent);
        const fileName = `test-file-${Date.now()}.txt`;
        
        console.log(`Uploading test file: ${fileName}`);
        
        // Attempt upload
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, testBuffer, {
                contentType: 'text/plain'
            });
        
        if (error) {
            console.error('❌ Upload failed:', error);
            return;
        }
        
        console.log('✅ Upload successful:', data);
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
        
        console.log('Public URL:', publicUrl);
        
        console.log('Test completed successfully!');
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

testUpload(); 