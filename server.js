// Load environment variables
require('dotenv').config();

// Basic Node.js server for the ShanSong application

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const { uploadToSupabase, uploadMultipleFiles, deleteFile, supabase } = require('./utils/storage');
// Import payment controller
const { 
    initializePayment, 
    capturePaypalPayment, 
    cancelPaypalPayment, 
    getPaymentStatus,
    getPaymentHistory
} = require('./utils/payment/paymentController');
const { handlePayPalWebhook } = require('./utils/payment/webhooks');
const { 
    scheduleAbandonedPaymentChecks 
} = require('./utils/payment/abandonedPayments');

// Initialize Airtable only if enabled
const USE_AIRTABLE_BACKUP = process.env.USE_AIRTABLE_BACKUP === 'true';
let base;

if (USE_AIRTABLE_BACKUP) {
    const Airtable = require('airtable');
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat0k8XuZRzbgfr5D.ff14421558961d2f39b20ec5b91a968fafd8eed7594e9f62bd61179bce21822a';
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appFDJeAd9Hy9vIzc'; // Replace with your actual Base ID
    base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
    console.log('Airtable backup is enabled');
} else {
    console.log('Airtable backup is disabled');
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server for real-time tracking
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// In-memory storage for orders and riders (would be replaced with a database)
const orders = [];
const riders = [
    { id: 1, name: 'John Smith', phone: '(212) 555-1234', rating: 4.8, available: true },
    { id: 2, name: 'Jane Doe', phone: '(646) 555-5678', rating: 4.9, available: true },
    { id: 3, name: 'Mike Johnson', phone: '(917) 555-9012', rating: 4.7, available: true }
];

// WebSocket connections
const clients = new Map();

wss.on('connection', (ws) => {
    const id = Date.now();
    clients.set(id, ws);
    
    console.log(`New client connected: ${id}`);
    
    ws.on('message', (message) => {
        console.log(`Received message from client ${id}: ${message}`);
        
        try {
            const data = JSON.parse(message);
            
            // Handle different message types
            if (data.type === 'subscribe-to-order') {
                ws.orderId = data.orderId;
                
                // Send current order status if available
                const order = orders.find(o => o.id === data.orderId);
                if (order) {
                    ws.send(JSON.stringify({
                        type: 'order-update',
                        order: order
                    }));
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        clients.delete(id);
        console.log(`Client disconnected: ${id}`);
    });
});

// API Routes
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Log the incoming request for debugging
        console.log('Received order data:', JSON.stringify(orderData));
        
        // Generate order ID
        const orderId = generateOrderId(orderData);
        
        // Prepare order data for Supabase
        const order = {
            order_id: parseInt(orderId.replace(/\D/g, '')), // Extract numeric part
            status: 'Placed',
            created_at: new Date().toISOString(),
            sender_name: orderData[' Sender Name '],
            sender_phone: orderData[' Sender Phone '],
            receiver_name: orderData[' Receiver Name '],
            receiver_phone: orderData[' Receiver Phone '],
            pickup_address: orderData[' Pickup Address '],
            delivery_address: orderData[' Delivery Address '],
            item_type: orderData[' Item Type '],
            item_size: orderData[' Item Size '],
            item_weight: orderData[' Item Weight '] || '',
            special_requirements: orderData[' Special Requirements '] || '',
            distance: parseFloat(orderData[' Distance ']) || 0,
            estimated_time: parseInt(orderData[' Estimated Time ']) || 0,
            price: parseFloat(orderData[' Price '].replace('$', '')) || 0,
            payment_status: orderData[' Payment Status '],
            payment_method: orderData[' Payment Method '],
            attachments: orderData.attachments || null // URLs from previous file uploads
        };

        console.log('Prepared order data for Supabase:', JSON.stringify(order));

        // Insert into Supabase with explicit headers
        const { data, error } = await supabase
            .from('orders')
            .insert([order])
            .select();

        if (error) {
            console.error('Supabase error details:', error);
            throw error;
        }

        console.log('Order successfully created in Supabase:', data);

        // Also save to Airtable as backup
        if (USE_AIRTABLE_BACKUP) {
            try {
                const airtableRecord = await base('Orders').create([{ fields: orderData }]);
                console.log('Backup saved to Airtable:', airtableRecord[0].getId());
            } catch (airtableError) {
                console.error('Airtable backup failed:', airtableError);
                // Continue even if Airtable backup fails
            }
        }

        res.status(201).json({
            success: true,
            order: {
                id: order.order_id,
                status: order.status
            }
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            details: error.message
        });
    }
});

app.get('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }
    
    res.json({
        success: true,
        order: order
    });
});

// File upload endpoint - now supports multiple files with type validation
app.post('/api/upload', upload.array('files', 5), async (req, res) => {
    try {
        console.log('Received upload request');
        console.log('Number of files:', req.files ? req.files.length : 0);
        
        if (!req.files || req.files.length === 0) {
            console.log('No files received in request');
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        // Validate file types
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/csv'];
        const invalidFiles = req.files.filter(file => !allowedTypes.includes(file.mimetype));
        
        if (invalidFiles.length > 0) {
            const invalidFileNames = invalidFiles.map(f => f.originalname).join(', ');
            console.log(`Invalid file types detected: ${invalidFileNames}`);
            return res.status(400).json({ 
                success: false, 
                message: `Invalid file types. Only JPG, PNG, PDF, and CSV are allowed. Rejected files: ${invalidFileNames}` 
            });
        }

        // Log file details
        req.files.forEach((file, index) => {
            console.log(`File ${index + 1}:`, {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: `${Math.round(file.size / 1024)} KB`
            });
        });

        // Upload all files to Supabase
        console.log('Starting file upload to Supabase...');
        let urls = [];
        
        try {
            urls = await uploadMultipleFiles(req.files);
            console.log('Files uploaded successfully, URLs:', urls);
        } catch (uploadError) {
            console.error('Error during upload:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Return the URLs in the response
        res.json({
            success: true,
            urls: urls,
            count: urls.length
        });
    } catch (error) {
        console.error('Upload error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'File upload failed',
            error: {
                message: error.message,
                details: error.details || {},
                statusCode: error.statusCode
            }
        });
    }
});

// File deletion endpoint
app.post('/api/delete', async (req, res) => {
    try {
        console.log('Received delete request:', req.body);
        const { url } = req.body;
        
        if (!url) {
            console.log('Missing URL in delete request');
            return res.status(400).json({ 
                success: false, 
                message: 'URL is required' 
            });
        }

        console.log('Deleting file with URL:', url);
        
        try {
            const result = await deleteFile(url);
            
            return res.json({
                success: true,
                message: 'File deleted successfully',
                data: result
            });
        } catch (deleteError) {
            console.error('Error from deleteFile function:', deleteError);
            
            return res.status(500).json({
                success: false,
                message: 'File deletion failed',
                error: deleteError.message || 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Delete endpoint error:', error);
        console.error('Error stack:', error.stack);
        
        return res.status(500).json({
            success: false,
            message: 'Server error while processing deletion request',
            error: error.message
        });
    }
});

// Function to process an order (assign rider, simulate delivery)
function processOrder(order) {
    console.log(`Processing order ${order.id}`);
    
    // Find an available rider
    const availableRider = riders.find(r => r.available);
    if (!availableRider) return;
    
    // Assign rider to order
    availableRider.available = false;
    order.rider = availableRider;
    order.status = 'rider_assigned';
    
    // Update Airtable with rider assignment
    if (USE_AIRTABLE_BACKUP && order.airtableId) {
        base('Orders').update([
            {
                id: order.airtableId,
                fields: {
                    'Status': 'Rider Assigned'
                }
            }
        ]).catch(error => {
            console.error('Error updating Airtable:', error);
        });
    }
    
    // Notify clients about the rider assignment
    broadcastOrderUpdate(order);
    
    // Simulate rider pickup
    setTimeout(() => {
        order.status = 'pickup';
        
        // Update Airtable with pickup status
        if (USE_AIRTABLE_BACKUP && order.airtableId) {
            base('Orders').update([
                {
                    id: order.airtableId,
                    fields: {
                        'Status': 'Pickup'
                    }
                }
            ]).catch(error => {
                console.error('Error updating Airtable:', error);
            });
        }
        
        broadcastOrderUpdate(order);
        
        // Simulate delivery
        setTimeout(() => {
            order.status = 'delivered';
            availableRider.available = true; // Rider becomes available again
            
            // Update Airtable with delivered status
            if (USE_AIRTABLE_BACKUP && order.airtableId) {
                base('Orders').update([
                    {
                        id: order.airtableId,
                        fields: {
                            'Status': 'Delivered'
                        }
                    }
                ]).catch(error => {
                    console.error('Error updating Airtable:', error);
                });
            }
            
            broadcastOrderUpdate(order);
        }, 15000); // 15 seconds for delivery
    }, 10000); // 10 seconds for pickup
}

// Function to broadcast order updates to subscribed clients
function broadcastOrderUpdate(order) {
    const update = {
        type: 'order-update',
        order: order
    };
    
    clients.forEach((ws, id) => {
        if (ws.orderId === order.id && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(update));
        }
    });
}

// Check if running in Vercel serverless environment
const isVercel = process.env.VERCEL === '1';

// If running in Vercel, export the API routes as serverless functions
if (isVercel) {
    // Export the API handler for Vercel serverless functions
    module.exports = app;
} else {
    // Start server normally for local development
    const PORT = process.env.PORT || 3002;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`PayPal test page available at: http://localhost:${PORT}/paypal-test`);
        console.log(`PayPal API endpoint: http://localhost:${PORT}/api/payment/initialize`);
    });
}

// Helper function to generate order ID
function generateOrderId(orderData) {
    const timestamp = new Date().getTime();
    const senderInitials = orderData[' Sender Name ']
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `SH-${senderInitials}-${timestamp.toString().slice(-6)}-${randomDigits}`;
}

// Test route for file upload
app.get('/test-upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Payment API Routes
app.post('/api/payment/initialize', initializePayment);
app.get('/api/paypal/capture', capturePaypalPayment);
app.get('/api/paypal/cancel', cancelPaypalPayment);
app.get('/api/payment/status/:orderId', getPaymentStatus);
app.get('/api/payment/history/:orderId', getPaymentHistory);

// PayPal test page route
app.get('/paypal-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'paypal-test.html'));
});

// PayPal webhook route
app.post('/api/webhooks/paypal', express.raw({ type: 'application/json' }), handlePayPalWebhook);

// Start the abandoned payment detection system
scheduleAbandonedPaymentChecks(15); // Check every 15 minutes

// Add a route to check payment status by order ID
app.get('/api/payment/check/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get the latest payment for this order
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'No payment found for this order'
      });
    }
    
    // If the payment is still pending and was created more than 30 minutes ago, mark it as abandoned
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    if (payment.status === 'Pending' && new Date(payment.created_at) < thirtyMinutesAgo) {
      // Mark as abandoned
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'Abandoned',
          payment_details: {
            ...payment.payment_details,
            abandoned_at: new Date().toISOString(),
            reason: 'Payment process not completed within 30 minutes'
          }
        })
        .eq('id', payment.id);
        
      if (updateError) {
        console.error('Error updating abandoned payment:', updateError);
      } else {
        payment.status = 'Abandoned';
      }
    }
    
    return res.json({
      success: true,
      payment: {
        id: payment.payment_id,
        status: payment.status,
        method: payment.payment_method,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.created_at
      }
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: error.message
    });
  }
}); 