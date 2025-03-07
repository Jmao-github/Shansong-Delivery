// Load environment variables
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'delivery-attachments';

console.log('Testing Supabase connection with:');
console.log('URL:', supabaseUrl);
console.log('Key (first 10 chars):', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'undefined');
console.log('Bucket:', bucketName);

// Create client - Try with options that skip auth checks
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Try minimal approach for storage access
const storage = supabase.storage;

async function runTests() {
    try {
        // Print key details
        console.log('\n------ Analyzing API Key ------');
        try {
            const keyParts = supabaseKey.split('.');
            if (keyParts.length === 3) {
                const header = JSON.parse(Buffer.from(keyParts[0], 'base64').toString());
                const payload = JSON.parse(Buffer.from(keyParts[1], 'base64').toString());
                
                console.log('Key type:', header.typ);
                console.log('Key algorithm:', header.alg);
                console.log('Key issuer:', payload.iss);
                console.log('Project reference:', payload.ref);
                console.log('Role:', payload.role);
                console.log('Expiration time:', new Date(payload.exp * 1000).toISOString());
                
                // Check if key is expired
                if (payload.exp * 1000 < Date.now()) {
                    console.error('❌ API Key is EXPIRED!');
                } else {
                    console.log('✅ API Key is not expired');
                }
            }
        } catch (e) {
            console.error('Error parsing JWT token:', e.message);
        }

        console.log('\n------ Testing Basic Auth ------');
        const { data: user, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.log('Auth Info:', authError);
        } else {
            console.log('Auth Data:', user);
        }

        console.log('\n------ Testing Bucket Access ------');
        const { data: buckets, error: bucketsError } = await storage.listBuckets();
        
        if (bucketsError) {
            console.error('❌ Failed to list buckets:', bucketsError);
            return;
        }
        
        console.log('✅ Successfully connected to Supabase Storage');
        console.log('Available buckets:', buckets.map(b => b.name));
        
        // Check if our bucket exists
        const bucketExists = buckets.some(b => b.name === bucketName);
        if (!bucketExists) {
            console.error(`❌ Bucket "${bucketName}" does not exist!`);
            return;
        }
        console.log(`✅ Bucket "${bucketName}" exists`);
        
        // Test file upload
        console.log('\n------ Testing File Upload ------');
        // Create a small test file
        const testFile = Buffer.from('This is a test file for Supabase storage upload.');
        const fileName = `test-${Date.now()}.txt`;
        
        const { data: uploadData, error: uploadError } = await storage
            .from(bucketName)
            .upload(fileName, testFile, {
                contentType: 'text/plain',
                upsert: false
            });
            
        if (uploadError) {
            console.error('❌ Failed to upload test file:', uploadError);
            return;
        }
        
        console.log('✅ Successfully uploaded test file');
        console.log('Upload response:', uploadData);
        
        // Get the public URL
        const { data: urlData } = storage
            .from(bucketName)
            .getPublicUrl(fileName);
            
        console.log('Public URL:', urlData.publicUrl);
        
        // Test deleting the file
        console.log('\n------ Testing File Deletion ------');
        const { data: deleteData, error: deleteError } = await storage
            .from(bucketName)
            .remove([fileName]);
            
        if (deleteError) {
            console.error('❌ Failed to delete test file:', deleteError);
            return;
        }
        
        console.log('✅ Successfully deleted test file');
        console.log('All tests passed! Supabase storage is working correctly.');
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

runTests(); 