# PayPal Integration Testing Information

## Purpose of This Document
This document contains all the necessary information for testing the PayPal integration in the ShanSong application. It includes test account credentials, verification codes, test credit cards, and testing procedures.

## Test Environment
- **Environment**: PayPal Sandbox (Testing)
- **Base URL**: https://api-m.sandbox.paypal.com
- **Test Page URL**: http://localhost:3002/paypal-test

## PayPal API Credentials
- **Client ID**: AUEcun4cVXfSVrGW502hZhoBFrqhxMZ8xtUUU9wc-R20wJrQK-OuY9cUw6emSTWeDxgVcYwc08KJ8LXx
- **Secret**: ENGNZ3YhWEdNQq3-L5v9kjdcPTNmBr2KP3YJRTGW0uTtf53HKGGWQB9yo6a_H0yr4NT_hFJR6ESzyZ86

## Test Accounts

### Buyer (Customer) Test Account
- **Email**: sb-fikgd38859343@personal.example.com
- **Password**: gf7pI5-P
- **Account Type**: Personal

### Business (Merchant) Test Account
- **Email**: sb-nglwi38856934@business.example.com
- **Password**: M*4vHuW8
- **Account Type**: Business

### Alternative Buyer Account (Not Currently Used)
- **Email**: sb-47bdo29390553@personal.example.com
- **Password**: testuser123
- **Account Type**: Personal

## Verification Codes
- **6-Digit Verification Code**: `111111`
- **Alternative Codes**:
  - `123456`
  - `999999`
  - `000000`
  - `555555`

## Test Credit Cards
For use within the PayPal Sandbox environment:

### Visa
- **Card Number**: 4111 1111 1111 1111
- **Expiration Date**: Any future date
- **CVV**: Any 3 digits

### Mastercard
- **Card Number**: 5555 5555 5555 4444
- **Expiration Date**: Any future date
- **CVV**: Any 3 digits

### American Express
- **Card Number**: 3782 8224 6310 005
- **Expiration Date**: Any future date
- **CVV**: Any 4 digits

## Database Structure

### Payments Table
The payments table in Supabase tracks all payment transactions:

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(order_id),
    payment_id VARCHAR NOT NULL,
    payment_method VARCHAR NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    payment_details JSONB,
    CONSTRAINT unique_payment_id UNIQUE (payment_id)
);
```

### Payment Status Values
- **Unpaid**: Initial state, no payment attempted
- **Pending**: Payment initiated but not completed
- **Paid**: Payment successfully completed
- **Failed**: Payment attempt failed
- **Refunded**: Payment was refunded
- **Cancelled**: Payment was cancelled by user
- **Processing**: Payment is being processed
- **Abandoned**: Payment was initiated but not completed within 30 minutes

## Testing Procedures

### 1. Test PayPal API Connection
Run the connection test script to verify API credentials:
```