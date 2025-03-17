/**
 * Bounce Tracker
 * 
 * This script tracks when users leave pages during the payment process
 * and records this information in the database.
 */

class BounceTracker {
    constructor() {
        this.paymentId = null;
        this.orderId = null;
        this.currentPage = window.location.pathname;
        this.isTracking = false;
        
        // Get payment and order IDs from URL or localStorage
        this.initializeFromUrl();
        this.initializeFromStorage();
        
        // Set up event listeners if we have a payment to track
        if (this.shouldTrack()) {
            this.setupTracking();
        }
    }
    
    initializeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');
        const paymentId = urlParams.get('paymentId');
        
        if (orderId) {
            this.orderId = orderId;
            localStorage.setItem('bt_orderId', orderId);
        }
        
        if (paymentId) {
            this.paymentId = paymentId;
            localStorage.setItem('bt_paymentId', paymentId);
        }
    }
    
    initializeFromStorage() {
        if (!this.orderId) {
            this.orderId = localStorage.getItem('bt_orderId');
        }
        
        if (!this.paymentId) {
            this.paymentId = localStorage.getItem('bt_paymentId');
        }
    }
    
    shouldTrack() {
        // Only track if we have an order ID and the current page is part of the payment flow
        return this.orderId && this.isPaymentPage();
    }
    
    isPaymentPage() {
        const paymentPages = [
            '/index.html',
            '/order-confirmation.html',
            '/paypal-test.html'
        ];
        
        // Also consider PayPal URLs
        if (window.location.href.includes('paypal.com')) {
            return true;
        }
        
        return paymentPages.some(page => this.currentPage.includes(page));
    }
    
    setupTracking() {
        this.isTracking = true;
        
        // Track page unload events
        window.addEventListener('beforeunload', this.handleUnload.bind(this));
        
        // Track visibility changes (user switches tabs or minimizes browser)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Log that tracking has started
        console.log(`Bounce tracking started for order ${this.orderId} on page ${this.currentPage}`);
        
        // Record that the user visited this page
        this.recordPageVisit();
    }
    
    handleUnload(event) {
        // Don't track if navigating to known application pages
        const destinationUrl = document.activeElement.href;
        if (destinationUrl && this.isInternalNavigation(destinationUrl)) {
            return;
        }
        
        // Record the bounce
        this.recordBounce('page_unload', {
            reason: 'User left the page',
            destination: destinationUrl || 'unknown'
        });
    }
    
    handleVisibilityChange(event) {
        if (document.visibilityState === 'hidden') {
            // Record when user switches away from the page
            this.recordBounce('visibility_change', {
                reason: 'User switched to another tab or minimized browser',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    isInternalNavigation(url) {
        // Check if the URL is within our application
        const appDomain = window.location.origin;
        return url.startsWith(appDomain);
    }
    
    recordPageVisit() {
        // Record that the user visited this page
        fetch('/api/tracking/page-visit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: this.orderId,
                paymentId: this.paymentId,
                page: this.currentPage,
                timestamp: new Date().toISOString()
            })
        }).catch(error => {
            console.error('Error recording page visit:', error);
        });
    }
    
    recordBounce(eventType, details) {
        // Don't send duplicate bounce records
        if (this.bounceSent) {
            return;
        }
        
        this.bounceSent = true;
        
        // Use sendBeacon for more reliable data sending during page unload
        const data = {
            orderId: this.orderId,
            paymentId: this.paymentId,
            page: this.currentPage,
            eventType: eventType,
            details: details,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        // Try to use sendBeacon for more reliable delivery during page unload
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon('/api/tracking/bounce', blob);
        } else {
            // Fall back to fetch with keepalive
            fetch('/api/tracking/bounce', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(error => {
                console.error('Error recording bounce:', error);
            });
        }
    }
    
    // Static method to initialize tracking with specific payment ID
    static startTracking(orderId, paymentId) {
        localStorage.setItem('bt_orderId', orderId);
        localStorage.setItem('bt_paymentId', paymentId);
        
        // Return a new instance
        return new BounceTracker();
    }
    
    // Static method to stop tracking
    static stopTracking() {
        localStorage.removeItem('bt_orderId');
        localStorage.removeItem('bt_paymentId');
    }
}

// Initialize the bounce tracker when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.bounceTracker = new BounceTracker();
});

// Make BounceTracker available globally
window.BounceTracker = BounceTracker; 