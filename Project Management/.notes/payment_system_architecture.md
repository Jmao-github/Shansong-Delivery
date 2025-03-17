# ShanSong Payment System Architecture

## Purpose of This Document
This document describes the architecture and implementation details of the payment system in the ShanSong application. It serves as a reference for understanding how payments are processed, tracked, and managed throughout the application.

## Overview
The ShanSong payment system is designed to handle payment processing for delivery orders. It currently supports PayPal as the primary payment gateway, with plans to add additional payment methods in the future. The system includes features for payment status tracking, abandoned payment detection, and payment history management.

## System Components

### 1. Payment API
The payment API provides endpoints for initializing payments, capturing payments, and checking payment status. It is implemented in the `utils/payment` directory.

#### Key Files:
- `utils/payment/paypal.js`: PayPal API integration
- `utils/payment/paymentController.js`: Payment route handlers
- `utils/payment/abandonedPayments.js`: Abandoned payment detection
- `utils/payment/webhooks.js`: Payment webhook handlers

#### API Endpoints:
- `POST /api/payment/initialize`: Initialize a new payment
- `GET /api/paypal/capture`: Capture a PayPal payment
- `GET /api/paypal/cancel`: Handle PayPal payment cancellation
- `GET /api/payment/status/:orderId`: Get payment status for an order
- `GET /api/payment/history/:orderId`: Get payment history for an order
- `POST /api/webhooks/paypal`: Handle PayPal webhook events

### 2. Database Structure
The payment system uses two main tables in the Supabase database:

#### Orders Table
The orders table includes payment-related fields:
- `payment_status`: Current payment status
- `payment_method`: Payment method used
- `payment_reference`: Reference to the payment gateway transaction
- `payment_details`: JSON data with payment details

#### Payments Table
The payments table tracks all payment transactions:
- `id`: Unique identifier
- `order_id`: Reference to the order
- `payment_id`: Payment gateway transaction ID
- `payment_method`: Payment method used
- `amount`: Payment amount
- `currency`: Payment currency
- `status`: Payment status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `payment_details`: JSON data with payment details

### 3. Payment Flow

#### Standard Payment Flow:
1. User creates an order and selects a payment method
2. Order is created in the database with status "Unpaid"
3. User clicks "Place Order" to initiate payment
4. System creates a payment record with status "Pending"
5. User is redirected to the payment gateway (PayPal)
6. User completes payment on the gateway
7. System captures the payment and updates status to "Paid"
8. User is redirected to the order confirmation page

#### Abandoned Payment Flow:
1. User initiates payment but doesn't complete it
2. System detects the abandoned payment after 30 minutes
3. Payment status is updated to "Abandoned"
4. User can resume the payment from the order confirmation page

### 4. User Interface Components

#### Payment Method Selection:
- Simple radio button selection in the order preview modal
- Currently supports PayPal and WeChat (WeChat not implemented yet)

#### Order Confirmation Page:
- Displays payment status and details
- Shows payment history
- Provides option to resume abandoned payments

#### Payment History Component:
- Displays a list of payment attempts for an order
- Shows payment status, method, amount, and timestamp

## Implementation Details

### PayPal Integration
The PayPal integration uses the PayPal REST API to create and capture payments. It is implemented in the `utils/payment/paypal.js` file.

Key features:
- OAuth 2.0 authentication
- Order creation and management
- Payment capture
- Error handling

### Abandoned Payment Detection
The system includes a mechanism to detect and handle abandoned payments. It is implemented in the `utils/payment/abandonedPayments.js` file.

Key features:
- Scheduled checks for pending payments
- Automatic status updates for abandoned payments
- Resume payment functionality

### Payment Status Tracking
The system tracks payment status throughout the payment lifecycle. Payment status is stored in both the orders and payments tables.

Payment status values:
- Unpaid: Initial state
- Pending: Payment initiated
- Paid: Payment completed
- Failed: Payment failed
- Refunded: Payment refunded
- Cancelled: Payment cancelled
- Processing: Payment processing
- Abandoned: Payment abandoned

## Future Enhancements

### Planned Enhancements:
1. **Additional Payment Methods**: Add support for more payment gateways
2. **Subscription Payments**: Implement recurring payments for business customers
3. **Payment Analytics**: Add reporting and analytics for payment data
4. **Refund Processing**: Implement automated refund processing
5. **Fraud Detection**: Add fraud detection and prevention measures

## Conclusion
The ShanSong payment system provides a robust foundation for processing and managing payments. It is designed to be extensible, allowing for the addition of new payment methods and features in the future.

*Last updated: 2023-03-18* 