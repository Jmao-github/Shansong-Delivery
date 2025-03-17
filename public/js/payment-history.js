/**
 * Payment History Component
 * 
 * This script fetches and displays payment history for an order.
 */

class PaymentHistory {
  constructor(containerId, orderId) {
    this.container = document.getElementById(containerId);
    this.orderId = orderId;
    this.init();
  }
  
  async init() {
    if (!this.container || !this.orderId) return;
    
    try {
      await this.fetchPaymentHistory();
    } catch (error) {
      console.error('Error initializing payment history:', error);
      this.renderError('Failed to load payment history');
    }
  }
  
  async fetchPaymentHistory() {
    try {
      const response = await fetch(`/api/payment/history/${this.orderId}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.renderPaymentHistory(data.payments);
      } else {
        throw new Error(data.message || 'Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      this.renderError(error.message);
    }
  }
  
  renderPaymentHistory(payments) {
    if (!payments || payments.length === 0) {
      this.container.innerHTML = '<p>No payment records found for this order.</p>';
      return;
    }
    
    const html = `
      <h3>Payment History</h3>
      <div class="payment-history-list">
        ${payments.map(payment => this.renderPaymentItem(payment)).join('')}
      </div>
    `;
    
    this.container.innerHTML = html;
  }
  
  renderPaymentItem(payment) {
    const statusClass = this.getStatusClass(payment.status);
    const formattedDate = new Date(payment.created_at).toLocaleString();
    
    return `
      <div class="payment-history-item">
        <div class="payment-history-header">
          <span class="payment-history-date">${formattedDate}</span>
          <span class="payment-history-status ${statusClass}">${payment.status}</span>
        </div>
        <div class="payment-history-details">
          <p><strong>Method:</strong> ${payment.payment_method}</p>
          <p><strong>Amount:</strong> ${payment.currency} ${payment.amount.toFixed(2)}</p>
          <p><strong>Reference:</strong> ${payment.payment_id}</p>
        </div>
      </div>
    `;
  }
  
  getStatusClass(status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'failed':
        return 'status-failed';
      case 'refunded':
        return 'status-refunded';
      default:
        return 'status-processing';
    }
  }
  
  renderError(message) {
    this.container.innerHTML = `
      <div class="payment-history-error">
        <p>${message}</p>
      </div>
    `;
  }
}

// Export the component
window.PaymentHistory = PaymentHistory; 