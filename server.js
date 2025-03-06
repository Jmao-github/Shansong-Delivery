// Basic Node.js server for the ShanSong application

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require('body-parser');
const Airtable = require('airtable');

// Initialize Airtable
// In production, use environment variables for these values
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat0k8XuZRzbgfr5D.ff14421558961d2f39b20ec5b91a968fafd8eed7594e9f62bd61179bce21822a';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appFDJeAd9Hy9vIzc'; // Replace with your actual Base ID

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server for real-time tracking
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
        console.log('Received order data:', JSON.stringify(orderData, null, 2));

        // Update validation to match Airtable field names exactly
        const requiredFields = [
            ' Sender Name ', 
            ' Sender Phone ', 
            ' Receiver Name ', 
            ' Receiver Phone ', 
            ' Pickup Address ', 
            ' Delivery Address '
        ];

        // Check if the field names in the request match what we expect
        console.log('Available fields in request:', Object.keys(orderData));

        const missingFields = requiredFields.filter(field => !orderData[field]);

        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Create order internally
        const order = {
            id: generateOrderId(orderData),
            status: orderData[' Status '] || 'Placed',
            createdAt: orderData[' Created At '] || new Date().toISOString(),
            airtableFields: orderData
        };

        // Save to in-memory storage
        orders.push(order);

        // Add this function to generate a meaningful Order ID
        function generateOrderId(orderData) {
            const timestamp = new Date().getTime();
            const senderInitials = orderData[' Sender Name ']
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase();
            const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
            
            // Format: SH-{initials}-{timestamp}-{random}
            return `SH-${senderInitials}-${timestamp.toString().slice(-6)}-${randomDigits}`;
        }

        // Then update the orderData before saving to Airtable
        orderData[' Order ID '] = order.id;

        // Save directly to Airtable with matching field names
        try {
            console.log('Attempting to save to Airtable with fields:', JSON.stringify(orderData, null, 2));
            const airtableRecord = await base('Orders').create([{ fields: orderData }]);
            order.airtableId = airtableRecord[0].getId();
            console.log('Successfully saved to Airtable with ID:', order.airtableId);

            res.status(201).json({
                success: true,
                order: {
                    id: order.id,
                    airtableId: order.airtableId,
                    status: order.status
                }
            });

        } catch (airtableError) {
            console.error('Error saving to Airtable:', airtableError);
            console.error('Error details:', airtableError.message);
            if (airtableError.error) console.error('Additional error info:', airtableError.error);
            
            res.status(500).json({
                success: false,
                error: 'Failed to save to Airtable',
                details: airtableError.message
            });
        }
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
    if (order.airtableId) {
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
        if (order.airtableId) {
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
            if (order.airtableId) {
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
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} 