/**
 * Abandoned Payment Detection
 * 
 * This module handles detection and tracking of abandoned payments.
 */

const { supabase } = require('../storage');

/**
 * Check for abandoned payments
 * Payments that have been in 'Pending' status for more than 30 minutes
 * are considered abandoned
 */
async function checkForAbandonedPayments() {
  try {
    console.log('Checking for abandoned payments...');
    
    // Calculate the timestamp for 30 minutes ago
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    // Find payments that have been pending for more than 30 minutes
    const { data: abandonedPayments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'Pending')
      .lt('created_at', thirtyMinutesAgo.toISOString());
      
    if (error) {
      console.error('Error checking for abandoned payments:', error);
      return;
    }
    
    console.log(`Found ${abandonedPayments.length} potentially abandoned payments`);
    
    // Update each abandoned payment
    for (const payment of abandonedPayments) {
      await markPaymentAsAbandoned(payment.id, payment.payment_id, payment.order_id);
    }
  } catch (error) {
    console.error('Error in abandoned payment check:', error);
  }
}

/**
 * Mark a payment as abandoned
 * @param {number} paymentId - Database payment ID
 * @param {string} paymentReference - Payment gateway reference
 * @param {number} orderId - Order ID
 */
async function markPaymentAsAbandoned(paymentId, paymentReference, orderId) {
  try {
    console.log(`Marking payment ${paymentId} (${paymentReference}) as abandoned`);
    
    // Update the payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'Abandoned',
        payment_details: {
          ...payment.payment_details,
          abandoned_at: new Date().toISOString(),
          reason: 'Payment process not completed within 30 minutes'
        }
      })
      .eq('id', paymentId);
      
    if (paymentError) {
      console.error(`Error updating payment ${paymentId}:`, paymentError);
      return;
    }
    
    console.log(`Payment ${paymentId} marked as abandoned`);
  } catch (error) {
    console.error(`Error marking payment ${paymentId} as abandoned:`, error);
  }
}

/**
 * Schedule regular checks for abandoned payments
 * @param {number} intervalMinutes - Check interval in minutes
 */
function scheduleAbandonedPaymentChecks(intervalMinutes = 15) {
  console.log(`Scheduling abandoned payment checks every ${intervalMinutes} minutes`);
  
  // Run an initial check
  checkForAbandonedPayments();
  
  // Schedule regular checks
  setInterval(checkForAbandonedPayments, intervalMinutes * 60 * 1000);
}

module.exports = {
  checkForAbandonedPayments,
  markPaymentAsAbandoned,
  scheduleAbandonedPaymentChecks
}; 