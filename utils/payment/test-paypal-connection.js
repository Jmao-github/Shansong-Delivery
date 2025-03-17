/**
 * PayPal Connection Test Script
 * 
 * This script tests the connection to the PayPal API by attempting to get an access token.
 * Run this script directly with Node.js to verify your PayPal credentials are working.
 */

const { getAccessToken } = require('./paypal');

async function testPayPalConnection() {
    console.log('Testing PayPal API connection...');
    
    try {
        // Try to get an access token
        const accessToken = await getAccessToken();
        
        console.log('✅ SUCCESS: Connected to PayPal API');
        console.log('Access token received successfully');
        console.log(`Token length: ${accessToken.length} characters`);
        console.log(`Token preview: ${accessToken.substring(0, 20)}...`);
        
        return true;
    } catch (error) {
        console.error('❌ ERROR: Failed to connect to PayPal API');
        console.error('Error details:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        console.log('\nTroubleshooting tips:');
        console.log('1. Verify your Client ID and Secret are correct');
        console.log('2. Check your internet connection');
        console.log('3. Ensure the PayPal API is not experiencing downtime');
        
        return false;
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testPayPalConnection()
        .then(success => {
            if (success) {
                console.log('\nYou can now proceed with testing the full PayPal integration.');
            } else {
                console.log('\nPlease fix the connection issues before proceeding with testing.');
            }
        })
        .catch(err => {
            console.error('Unexpected error during test:', err);
        });
}

module.exports = { testPayPalConnection }; 