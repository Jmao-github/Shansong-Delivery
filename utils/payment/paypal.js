/**
 * PayPal Payment Integration
 * 
 * This module handles PayPal payment processing for the ShanSong application.
 * It uses the PayPal REST API to create and manage payment transactions.
 * 
 * Environment: Sandbox (Testing)
 * Currency: USD
 * Payment Type: One-time payments only
 * No shipping address collection
 */

const axios = require('axios');
require('dotenv').config();

// PayPal API Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AUEcun4cVXfSVrGW502hZhoBFrqhxMZ8xtUUU9wc-R20wJrQK-OuY9cUw6emSTWeDxgVcYwc08KJ8LXx';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'ENGNZ3YhWEdNQq3-L5v9kjdcPTNmBr2KP3YJRTGW0uTtf53HKGGWQB9yo6a_H0yr4NT_hFJR6ESzyZ86';
const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'; // Sandbox environment

/**
 * Get PayPal access token
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  try {
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v1/oauth2/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`
      },
      data: 'grant_type=client_credentials'
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to authenticate with PayPal');
  }
}

/**
 * Create a PayPal order
 * @param {Object} orderDetails - Order details including amount
 * @returns {Promise<Object>} PayPal order details
 */
async function createOrder(orderDetails) {
  try {
    const accessToken = await getAccessToken();
    
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: orderDetails.amount.toString()
        },
        description: `ShanSong Delivery Order #${orderDetails.orderId}`
      }],
      application_context: {
        brand_name: 'ShanSong Delivery',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/paypal/capture`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/paypal/cancel`
      }
    };
    
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v2/checkout/orders`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: payload
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating PayPal order:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create PayPal order');
  }
}

/**
 * Capture payment for a PayPal order
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<Object>} Capture details
 */
async function capturePayment(orderId) {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error capturing PayPal payment:', error.response ? error.response.data : error.message);
    throw new Error('Failed to capture PayPal payment');
  }
}

/**
 * Get details of a PayPal order
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<Object>} Order details
 */
async function getOrderDetails(orderId) {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'get',
      url: `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting PayPal order details:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get PayPal order details');
  }
}

module.exports = {
  createOrder,
  capturePayment,
  getOrderDetails,
  getAccessToken
}; 