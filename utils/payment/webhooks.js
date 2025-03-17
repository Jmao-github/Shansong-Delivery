/**
 * PayPal Webhook Handler
 * 
 * This module handles PayPal webhook events for payment status updates.
 */

const { supabase } = require('../storage');

/**
 * Handle PayPal webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handlePayPalWebhook(req, res) {
  try {
    const event = req.body;
    
    // Verify the webhook signature (in production)
    // This would require the PayPal SDK and webhook verification
    
    console.log('Received PayPal webhook event:', event.event_type);
    
    // Handle different event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentDenied(event);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentRefunded(event);
        break;
      // Add more event types as needed
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling PayPal webhook:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Handle payment completed event
 * @param {Object} event - PayPal event object
 */
async function handlePaymentCompleted(event) {
  const paymentId = event.resource.supplementary_data.related_ids.order_id;
  const captureId = event.resource.id;
  
  // Update payment status in database
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'Paid',
      payment_details: {
        ...event.resource,
        capture_id: captureId
      }
    })
    .eq('payment_id', paymentId);
    
  if (error) {
    console.error('Error updating payment status:', error);
  }
}

/**
 * Handle payment denied event
 * @param {Object} event - PayPal event object
 */
async function handlePaymentDenied(event) {
  const paymentId = event.resource.supplementary_data.related_ids.order_id;
  
  // Update payment status in database
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'Failed',
      payment_details: event.resource
    })
    .eq('payment_id', paymentId);
    
  if (error) {
    console.error('Error updating payment status:', error);
  }
}

/**
 * Handle payment refunded event
 * @param {Object} event - PayPal event object
 */
async function handlePaymentRefunded(event) {
  const paymentId = event.resource.supplementary_data.related_ids.order_id;
  
  // Update payment status in database
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'Refunded',
      payment_details: event.resource
    })
    .eq('payment_id', paymentId);
    
  if (error) {
    console.error('Error updating payment status:', error);
  }
}

module.exports = {
  handlePayPalWebhook
}; 