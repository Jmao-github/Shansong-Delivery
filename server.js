// Basic Node.js server for the ShanSong application

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require('body-parser');
const Airtable = require('airtable');

// Initialize Airtable
// In production, use environment variables for these values
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat0k8XuZRzbgfr5D.7d8f31068a137e8070a5ccdcce9c180b291314118b01a250889e362dc441d957';
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
        
        // Create a new order
        const order = {
            id: Date.now().toString(),
            status: 'placed',
            createdAt: new Date().toISOString(),
            ...orderData
        };
        
        // Save to in-memory storage
        orders.push(order);
        
        // Save to Airtable with detailed logging
        try {
            console.log('Attempting to save order to Airtable with data:', JSON.stringify(orderData));
            console.log('Using Airtable base ID:', AIRTABLE_BASE_ID);
            console.log('Using Airtable API key (first 5 chars):', AIRTABLE_API_KEY.substring(0, 5) + '...');
            
            // Simplify the fields object to reduce potential errors
            const fields = {
                'Status': 'Placed',
                'Created At': order.createdAt,
                'Sender Name': order.senderName || '',
                'Sender Phone': order.senderPhone || '',
                'Receiver Name': order.receiverName || '',
                'Receiver Phone': order.receiverPhone || '',
                'Pickup Address': order.pickupAddress || '',
                'Delivery Address': order.deliveryAddress || '',
                'Item Type': order.itemType || '',
                'Item Size': order.itemSize || '',
                'Item Weight': order.itemWeight || 'Light',
                'Special Requirements': order.specialRequirements || '',
                'Distance': 0, // Set default values for numeric fields
                'Estimated Time': 0,
                'Price': 0,
                'Payment Status': 'Unpaid'
            };
            
            // Try to parse numeric values, but use defaults if they fail
            try {
                if (order.distance) fields['Distance'] = parseFloat(order.distance) || 0;
                if (order.estimatedTime) fields['Estimated Time'] = parseInt(order.estimatedTime) || 0;
                if (order.price) fields['Price'] = parseFloat(order.price) || 0;
            } catch (parseError) {
                console.error('Error parsing numeric values:', parseError);
            }
            
            console.log('Prepared fields for Airtable:', fields);
            
            const airtableRecord = await base('Orders').create([{ fields }]);
            
            console.log('Order successfully saved to Airtable:', airtableRecord);
            // Update order with Airtable ID
            order.airtableId = airtableRecord[0].getId();
        } catch (airtableError) {
            console.error('Error saving to Airtable:', airtableError);
            console.error('Error details:', airtableError.message);
            console.error('Error stack:', airtableError.stack);
            // Continue even if Airtable save fails
        }
        
        // Simulate order processing
        setTimeout(() => {
            processOrder(order);
        }, 5000);
        
        res.status(201).json({
            success: true,
            order: {
                id: order.id,
                status: order.status
            }
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
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