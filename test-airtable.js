const fetch = require('node-fetch');

// If you don't have node-fetch installed, run:
// npm install node-fetch@2

async function testOrderCreation() {
  console.log('Starting Airtable integration test...');
  
  const testOrder = {
    senderName: 'Test Sender',
    senderPhone: '123-456-7890',
    receiverName: 'Test Receiver',
    receiverPhone: '098-765-4321',
    pickupAddress: '123 Pickup St, New York, NY 10001',
    deliveryAddress: '456 Delivery Ave, New York, NY 10002',
    itemType: 'Package',
    itemSize: 'Medium',
    itemWeight: 'Light',
    specialRequirements: 'Handle with care',
    distance: '5.2',
    estimatedTime: '30',
    price: '$25.50',
    paymentStatus: 'Unpaid',
    paymentMethod: 'Credit Card'
  };
  
  try {
    console.log('Sending test order to API...');
    console.log('Test order data:', JSON.stringify(testOrder, null, 2));
    
    // Make sure your server is running on port 3001
    const response = await fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrder),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Order created successfully!');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.order.airtableId) {
        console.log('✅ Airtable ID received:', data.order.airtableId);
        console.log('Order was successfully saved to Airtable!');
        
        // Verify the order details by fetching it
        console.log('\nFetching order details to verify...');
        const orderResponse = await fetch(`http://localhost:3001/api/orders/${data.order.id}`);
        const orderData = await orderResponse.json();
        
        if (orderResponse.ok) {
          console.log('✅ Order details retrieved successfully:');
          console.log(JSON.stringify(orderData, null, 2));
        } else {
          console.log('❌ Failed to retrieve order details:', orderData.error);
        }
      } else {
        console.log('❌ No Airtable ID in response. Order might not have been saved to Airtable.');
      }
    } else {
      console.log('❌ ERROR: Failed to create order');
      console.log('Error details:', data.error);
      if (data.details) {
        console.log('Additional details:', data.details);
      }
    }
  } catch (error) {
    console.error('❌ ERROR: Exception during test:', error.message);
    console.error('Make sure your server is running on port 3001');
  }
}

// Run the test
testOrderCreation(); 