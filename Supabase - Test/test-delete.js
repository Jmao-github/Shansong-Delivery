// Load environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'delivery-attachments';

console.log('Testing Supabase file deletion with:');
console.log('URL:', supabaseUrl);
console.log('Key type:', process.env.SUPABASE_SERVICE_KEY ? 'Service key' : 'Anon key');
console.log('Bucket:', bucketName);

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

// Filename to test with
const testFilename = process.argv[2];

if (!testFilename) {
  console.error('Please provide a filename to delete');
  console.error('Usage: node test-delete.js <filename>');
  process.exit(1);
}

console.log(`Will attempt to delete file: ${testFilename}`);

async function testDeletion() {
  try {
    // List files to confirm file exists
    console.log('Listing files in bucket to check existence...');
    const { data: fileList, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list();

    if (listError) {
      console.error('Error listing files:', listError);
    } else {
      console.log('Files in bucket:', fileList.map(f => f.name));
      
      const fileExists = fileList.some(f => f.name === testFilename);
      if (fileExists) {
        console.log(`✅ File ${testFilename} exists in bucket`);
      } else {
        console.log(`⚠️ File ${testFilename} not found in bucket!`);
        // Continue anyway for testing
      }
    }

    // Attempt direct file deletion
    console.log(`\nAttempting to delete file: ${testFilename}`);
    
    // Using the array version (how we're currently doing it)
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .remove([testFilename]);

    if (error) {
      console.error('❌ Delete failed:', error);
    } else {
      console.log('✅ Delete successful:', data);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testDeletion(); 