# Project Overview
Use this guide to build backend for the web app

# Requirements
- We will use Supabase as backend to store order information and images

# Tables & buckets created
Supabase storage Bucket: "delivery-attachments"

Table already created & with Sample data
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'Placed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sender_name VARCHAR(100) NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_size VARCHAR(20) NOT NULL,
    item_weight VARCHAR(20) NOT NULL,
    special_requirements TEXT,
    distance NUMERIC(10,2) NOT NULL DEFAULT 0,
    estimated_time INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    payment_method VARCHAR(50) NOT NULL,
    attachments TEXT, -- To store URLs or file references later
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO orders (
    order_id, status, created_at, sender_name, sender_phone, receiver_name, receiver_phone,
    pickup_address, delivery_address, item_type, item_size, item_weight, special_requirements,
    distance, estimated_time, price, payment_status, payment_method, attachments, last_modified
) VALUES
(1001001, 'Delivered', NOW() - INTERVAL '2 days', 'Emma Watson', '(212) 555-0101', 'Liam Smith', '(917) 555-0202',
 '100 Broadway, New York, NY 10005', '200 Wall St, New York, NY 10005', 'Documents', 'Small', 'Light',
 'Handle with care', 3.5, 25, 19.99, 'Paid', 'Credit Card', NULL, NOW() - INTERVAL '1 day'),

(1001002, 'Pickup', NOW() - INTERVAL '1 day', 'Olivia Johnson', '(347) 555-0303', 'Noah Brown', '(646) 555-0404',
 '500 5th Ave, New York, NY 10018', '700 Madison Ave, New York, NY 10065', 'Food', 'Medium', 'Medium',
 'Keep refrigerated', 5.2, 35, 25.50, 'Unpaid', 'Cash', NULL, NOW()),

(1001003, 'Placed', NOW(), 'Ava Williams', '(718) 555-0505', 'William Davis', '(201) 555-0606',
 '300 Lexington Ave, New York, NY 10016', '400 Amsterdam Ave, New York, NY 10024', 'Electronics', 'Large', 'Heavy',
 'Fragile item, urgent delivery', 7.8, 40, 35.75, 'Unpaid', 'Venmo', NULL, NOW());



# Documentations
## Example of uploading files to supabase storage
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase i createClient('your_project_url', 'your_supabase_api_key')

// Upload file using standard upload
async function uploadFile(file) {
const { data, error } = await supabase.storage.from('bucket_name').upload('file_path', file)
if (error) {
// Handle error
} else {
// Handle success
}
}
