// Load environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for table creation
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Checking/creating Supabase orders table with:');
console.log('URL:', supabaseUrl);

// Create client with explicit configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createOrdersTable() {
    try {
        console.log('Checking if orders table exists...');
        
        // Check if the table exists by trying to select from it
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Error checking table:', error);
            
            if (error.code === 'PGRST104' || error.message.includes('relation "orders" does not exist')) {
                console.log('Orders table does not exist. Creating it via Supabase dashboard is recommended.');
                console.log('Please create a table with the following structure:');
                console.log(`
Table Name: orders
Columns:
- id: serial (primary key)
- order_id: bigint (unique, not null)
- status: varchar
- created_at: timestamptz (default: now())
- sender_name: varchar
- sender_phone: varchar
- receiver_name: varchar
- receiver_phone: varchar
- pickup_address: text
- delivery_address: text
- item_type: varchar
- item_size: varchar
- item_weight: varchar
- special_requirements: text
- distance: decimal
- estimated_time: integer
- price: decimal
- payment_status: varchar
- payment_method: varchar
- attachments: text[]
                `);
                
                console.log('After creating the table, enable Row Level Security and add appropriate policies.');
            }
            return;
        }
        
        console.log('Orders table already exists');
        console.log('Table structure:', Object.keys(data[0] || {}).join(', '));
    } catch (error) {
        console.error('Error:', error);
    }
}

createOrdersTable(); 