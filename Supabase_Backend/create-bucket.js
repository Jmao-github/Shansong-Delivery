// Load environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'delivery-attachments';

console.log('Creating Supabase bucket with:');
console.log('URL:', supabaseUrl);
console.log('Bucket:', bucketName);

// Create client with explicit configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createBucket() {
    try {
        console.log(`Attempting to create bucket: ${bucketName}`);
        
        // Create the bucket with minimal configuration
        const { data, error } = await supabase.storage.createBucket(bucketName, { public: true });
        
        if (error) {
            console.error('Error creating bucket:', error);
            return;
        }
        
        console.log('Bucket created successfully:', data);
        
        // List buckets to verify
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
            console.error('Error listing buckets:', listError);
            return;
        }
        
        console.log('Available buckets:', buckets.map(b => b.name));
    } catch (error) {
        console.error('Error:', error);
    }
}

createBucket(); 