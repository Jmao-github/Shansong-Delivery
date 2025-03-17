/**
 * Payment Controller
 * 
 * This module handles payment-related routes and logic for the ShanSong application.
 * It integrates with different payment gateways (currently PayPal) and manages
 * payment status tracking.
 */

const { createOrder, capturePayment, getOrderDetails } = require('./paypal');
const { supabase } = require('../storage');

/**
 * Initialize a payment for an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function initializePayment(req, res) {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    
    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, amount, or paymentMethod'
      });
    }
    
    // Validate that the order exists
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
      
    if (orderError || !orderData) {
      console.error('Error fetching order:', orderError);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Handle different payment methods
    if (paymentMethod === 'PayPal') {
      const paypalOrder = await createOrder({
        orderId,
        amount
      });
      
      // Create a record in the payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          payment_id: paypalOrder.id,
          payment_method: 'PayPal',
          amount: parseFloat(amount),
          currency: 'USD',
          status: 'Pending',
          payment_details: paypalOrder
        });
        
      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Continue anyway as the order has been updated via trigger
      }
      
      return res.json({
        success: true,
        paymentId: paypalOrder.id,
        approvalUrl: paypalOrder.links.find(link => link.rel === 'approve').href
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Payment method ${paymentMethod} is not supported yet`
      });
    }
  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
}

/**
 * Capture a PayPal payment after user approval
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function capturePaypalPayment(req, res) {
  try {
    const { token, PayerID } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Missing PayPal order token'
      });
    }
    
    // Get the payment associated with this token
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', token)
      .single();
      
    if (paymentError || !paymentData) {
      console.error('Error fetching payment by token:', paymentError);
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this token'
      });
    }
    
    // Capture the payment
    const captureData = await capturePayment(token);
    
    // Update payment status in the payments table
    const paymentStatus = captureData.status === 'COMPLETED' ? 'Paid' : 'Processing';
    
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        payment_details: captureData
      })
      .eq('payment_id', token);
      
    if (updateError) {
      console.error('Error updating payment status:', updateError);
    }
    
    // Redirect to order confirmation page
    res.redirect(`/order-confirmation.html?orderId=${paymentData.order_id}&status=${paymentStatus}`);
  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture payment',
      error: error.message
    });
  }
}

/**
 * Handle PayPal payment cancellation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function cancelPaypalPayment(req, res) {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Missing PayPal order token'
      });
    }
    
    // Get the payment associated with this token
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', token)
      .single();
      
    if (paymentError || !paymentData) {
      console.error('Error fetching payment by token:', paymentError);
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this token'
      });
    }
    
    // Update payment status in the payments table
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'Cancelled'
      })
      .eq('payment_id', token);
      
    if (updateError) {
      console.error('Error updating payment status to cancelled:', updateError);
    }
    
    // Redirect to order page with cancelled status
    res.redirect(`/order-confirmation.html?orderId=${paymentData.order_id}&status=cancelled`);
  } catch (error) {
    console.error('Error handling PayPal payment cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment cancellation',
      error: error.message
    });
  }
}

/**
 * Get payment status for an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing order ID'
      });
    }
    
    // Get the latest payment for this order
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (paymentError) {
      // If no payment found, get the order payment status
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('payment_status, payment_method, payment_reference')
        .eq('order_id', orderId)
        .single();
        
      if (orderError) {
        console.error('Error fetching order payment status:', orderError);
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      return res.json({
        success: true,
        paymentStatus: orderData.payment_status,
        paymentMethod: orderData.payment_method,
        paymentReference: orderData.payment_reference
      });
    }
    
    res.json({
      success: true,
      paymentStatus: paymentData.status,
      paymentMethod: paymentData.payment_method,
      paymentReference: paymentData.payment_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      createdAt: paymentData.created_at,
      updatedAt: paymentData.updated_at
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
}

/**
 * Get payment history for an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPaymentHistory(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing order ID'
      });
    }
    
    // Get all payments for this order
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
      
    if (paymentError) {
      console.error('Error fetching payment history:', paymentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment history'
      });
    }
    
    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
}

module.exports = {
  initializePayment,
  capturePaypalPayment,
  cancelPaypalPayment,
  getPaymentStatus,
  getPaymentHistory
}; 