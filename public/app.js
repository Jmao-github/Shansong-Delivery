// Main application JavaScript

// Make initMap a global function so Google Maps API can call it
let map;
let trackingMap;
let directionsService;
let directionsRenderer;
let pickupMarker;
let deliveryMarker;
let pickupAutocomplete;
let deliveryAutocomplete;

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const quickOrderForm = document.getElementById('quick-order-form');
    const previewOrderBtn = document.getElementById('preview-order');
    const submitOrderBtn = document.getElementById('submit-order');
    const orderPreviewModal = document.getElementById('order-preview-modal');
    const previewContent = document.getElementById('preview-content');
    const confirmOrderBtn = document.getElementById('confirm-order');
    const closeModalBtn = document.querySelector('.close-modal');
    const useCurrentLocationBtn = document.getElementById('use-current-location');
    const orderFormContainer = document.getElementById('order-form-container');
    const orderTrackingContainer = document.getElementById('order-tracking-container');
    
    // File upload elements
    const uploadBtn = document.getElementById('upload-btn');
    const itemImageInput = document.getElementById('item-image');
    const imagePreview = document.getElementById('image-preview');
    
    // Maps placeholders - will be replaced with actual map implementation
    const pickupMap = document.getElementById('map');
    const deliveryMap = document.getElementById('map');
    const routePreview = document.getElementById('map');
    const trackingMap = document.getElementById('tracking-map');
    
    // Initialize maps with placeholder text
    if (pickupMap) pickupMap.textContent = 'Google Maps will be displayed here (API key required)';
    if (trackingMap) trackingMap.textContent = 'Tracking Map will be displayed here (API key required)';
    
    // Event Listeners
    previewOrderBtn.addEventListener('click', showOrderPreview);
    closeModalBtn.addEventListener('click', closeModal);
    confirmOrderBtn.addEventListener('click', submitOrder);
    useCurrentLocationBtn.addEventListener('click', useCurrentLocation);
    quickOrderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        showOrderPreview();
    });
    
    // File upload event listeners
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            itemImageInput.click(); // Trigger the file input click
        });
    }
    
    if (itemImageInput) {
        itemImageInput.addEventListener('change', function() {
            handleFileUpload(this.files);
        });
    }
    
    // Handle file upload
    async function handleFileUpload(files) {
        if (!files.length) return;

        // Get existing files count
        const existingFiles = imagePreview.querySelectorAll('.file-container').length;
        const totalFiles = existingFiles + files.length;

        // Check if exceeding max files (5)
        if (totalFiles > 5) {
            alert('You can upload a maximum of 5 files. Please remove some files and try again.');
            return;
        }

        try {
            // Create FormData and append all files
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            // Upload files
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }

            // Process each uploaded URL
            result.urls.forEach(url => {
                // Create file container
                const fileContainer = document.createElement('div');
                fileContainer.className = 'file-container';

                // Create remove button
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-file-btn';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = () => deleteFile(url, fileContainer);

                // Check if the URL is an image
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                if (isImage) {
                    const img = document.createElement('img');
                    img.className = 'uploaded-image';
                    img.src = url;
                    img.onload = () => updateUploadButtonState();
                    fileContainer.appendChild(img);
                } else {
                    const fileIcon = document.createElement('div');
                    fileIcon.className = 'file-icon';
                    fileIcon.innerHTML = '📄';
                    fileContainer.appendChild(fileIcon);
                }

                fileContainer.appendChild(removeBtn);
                imagePreview.appendChild(fileContainer);

                // Store URL in hidden input
                const urlsInput = document.getElementById('uploaded-urls') || document.createElement('input');
                if (!urlsInput.id) {
                    urlsInput.type = 'hidden';
                    urlsInput.id = 'uploaded-urls';
                    document.querySelector('form').appendChild(urlsInput);
                }
                const urls = JSON.parse(urlsInput.value || '[]');
                urls.push(url);
                urlsInput.value = JSON.stringify(urls);
            });

            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'upload-success';
            successMessage.innerHTML = '✅ Files uploaded successfully';
            setTimeout(() => successMessage.remove(), 3000);
            imagePreview.appendChild(successMessage);

            // Update upload button state
            updateUploadButtonState();
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Failed to upload files: ${error.message}`);
        }
    }
    
    // Delete file from Supabase
    async function deleteFile(url, element) {
        try {
            // Extract and display the filename
            const encodedFilename = url.split('/').pop();
            const filename = decodeURIComponent(encodedFilename); // Decode for display
            console.log(`Attempting to delete file: ${filename}`);
            
            // Show delete in progress
            const removeBtn = element.querySelector('.remove-file-btn');
            if (removeBtn) {
                removeBtn.innerHTML = '...';
                removeBtn.disabled = true;
            }
            
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    url: url
                })
            });

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error(`Failed to parse response: ${response.status} ${response.statusText}`);
            }
            
            if (result.success) {
                // Remove from UI
                element.remove();
                
                // Remove URL from uploaded URLs
                const urlsInput = document.getElementById('uploaded-urls');
                if (urlsInput) {
                    const urls = JSON.parse(urlsInput.value || '[]');
                    const index = urls.indexOf(url);
                    if (index > -1) {
                        urls.splice(index, 1);
                        urlsInput.value = JSON.stringify(urls);
                    }
                }
                
                // Update upload button state
                updateUploadButtonState();
                console.log('File deleted successfully');
            } else {
                // Re-enable button
                if (removeBtn) {
                    removeBtn.innerHTML = '×';
                    removeBtn.disabled = false;
                }
                
                console.error(`Delete failed: ${result.message || 'Unknown error'}`);
                if (result.error) {
                    console.error(`Error details: ${result.error}`);
                }
                
                alert(`Failed to delete file: ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            
            // Re-enable button
            const removeBtn = element.querySelector('.remove-file-btn');
            if (removeBtn) {
                removeBtn.innerHTML = '×';
                removeBtn.disabled = false;
            }
            
            alert(`Failed to delete file: ${error.message}`);
        }
    }
    
    // Update upload button state based on file count
    function updateUploadButtonState() {
        const fileContainers = imagePreview.querySelectorAll('.file-container');
        const fileCount = fileContainers.length;
        
        if (fileCount >= 5) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="upload-icon">🚫</span> Max Files Reached (5)';
        } else {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<span class="upload-icon">📷</span> Upload Image or Bill';
        }
        
        // Show file count if any files are uploaded
        if (fileCount > 0) {
            // Remove existing count label if any
            const existingLabel = imagePreview.querySelector('.file-count');
            if (existingLabel) {
                existingLabel.remove();
            }
            
            const countLabel = document.createElement('div');
            countLabel.className = 'file-count';
            countLabel.textContent = `${fileCount}/5 files uploaded`;
            imagePreview.appendChild(countLabel);
        } else {
            // Remove count label if no files
            const existingLabel = imagePreview.querySelector('.file-count');
            if (existingLabel) {
                existingLabel.remove();
            }
        }
    }
    
    // Functions
    function showOrderPreview() {
        // Get form values
        const senderName = document.getElementById('sender-name').value;
        const senderPhone = document.getElementById('sender-phone').value;
        const receiverName = document.getElementById('receiver-name').value;
        const receiverPhone = document.getElementById('receiver-phone').value;
        const itemType = document.getElementById('item-type').value;
        const itemSize = document.getElementById('item-size').value;
        const itemWeight = document.getElementById('item-weight') ? document.getElementById('item-weight').value : '';
        const specialRequirements = document.getElementById('special-requirements').value;
        const pickupAddress = document.getElementById('pickup-address').value;
        const deliveryAddress = document.getElementById('delivery-address').value;
        
        // Validate form
        if (!senderName || !senderPhone || !receiverName || !receiverPhone || 
            !itemType || !itemSize || !pickupAddress || !deliveryAddress) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Create preview HTML
        let previewHTML = `
            <div class="preview-section">
                <h3>Sender</h3>
                <p><strong>Name:</strong> ${senderName}</p>
                <p><strong>Phone:</strong> ${senderPhone}</p>
            </div>
            
            <div class="preview-section">
                <h3>Receiver</h3>
                <p><strong>Name:</strong> ${receiverName}</p>
                <p><strong>Phone:</strong> ${receiverPhone}</p>
            </div>
            
            <div class="preview-section">
                <h3>Item Details</h3>
                <p><strong>Type:</strong> ${itemType}</p>
                <p><strong>Size:</strong> ${itemSize}</p>
                ${itemWeight ? `<p><strong>Weight:</strong> ${itemWeight}</p>` : ''}
                ${specialRequirements ? `<p><strong>Special Requirements:</strong> ${specialRequirements}</p>` : ''}
                ${imagePreview.innerHTML ? `<p><strong>Images/Files:</strong> Uploaded</p>` : ''}
            </div>
            
            <div class="preview-section">
                <h3>Locations</h3>
                <p><strong>Pickup:</strong> ${pickupAddress}</p>
                <p><strong>Delivery:</strong> ${deliveryAddress}</p>
                <p><strong>Estimated Distance:</strong> <span id="preview-distance">Calculating...</span></p>
            </div>
            
            <div class="preview-section">
                <h3>Estimated Price</h3>
                <p><strong>Base Fee:</strong> $10.00</p>
                <p><strong>Distance Fee:</strong> <span id="distance-fee">Calculating...</span></p>
                <p><strong>Total:</strong> <span id="total-price">Calculating...</span></p>
            </div>
            
            <div class="preview-section payment-section">
                <h3>Select Payment Method</h3>
                <div class="payment-options">
                    <div class="payment-option">
                        <input type="radio" id="payment-paypal" name="payment-method" value="PayPal" checked>
                        <label for="payment-paypal">
                            <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal">
                            PayPal
                        </label>
                    </div>
                    <div class="payment-option">
                        <input type="radio" id="payment-wechat" name="payment-method" value="WeChat">
                        <label for="payment-wechat">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/WeChat.svg/120px-WeChat.svg.png" alt="WeChat Pay" style="height: 23px;">
                            WeChat Pay
                        </label>
                    </div>
                </div>
                <div id="payment-qr-container" class="payment-qr-container">
                    <div id="paypal-qr" class="payment-qr active">
                        <img src="https://via.placeholder.com/200x200?text=PayPal+QR+Code" alt="PayPal QR Code">
                        <p>Scan with PayPal app to pay</p>
                    </div>
                    <div id="wechat-qr" class="payment-qr">
                        <img src="https://via.placeholder.com/200x200?text=WeChat+Pay+QR+Code" alt="WeChat Pay QR Code">
                        <p>Scan with WeChat to pay</p>
                    </div>
                </div>
            </div>
        `;
        
        // Update modal content and show it
        previewContent.innerHTML = previewHTML;
        orderPreviewModal.style.display = 'block';
        
        // Add payment method change event
        document.querySelectorAll('input[name="payment-method"]').forEach(input => {
            input.addEventListener('change', function() {
                document.querySelectorAll('.payment-qr').forEach(qr => qr.classList.remove('active'));
                if (this.value === 'PayPal') {
                    document.getElementById('paypal-qr').classList.add('active');
                } else if (this.value === 'WeChat') {
                    document.getElementById('wechat-qr').classList.add('active');
                }
            });
        });
        
        // Simulate distance calculation
        setTimeout(() => {
            const distance = calculateMockDistance(pickupAddress, deliveryAddress);
            const distanceFee = (distance * 2).toFixed(2);
            const totalPrice = (10 + parseFloat(distanceFee)).toFixed(2);
            
            document.getElementById('preview-distance').textContent = `${distance} miles`;
            document.getElementById('distance-fee').textContent = `$${distanceFee}`;
            document.getElementById('total-price').textContent = `$${totalPrice}`;
        }, 1000);
    }
    
    function closeModal() {
        orderPreviewModal.style.display = 'none';
    }
    
    function submitOrder() {
        // Validate form
        if (!validateOrderForm()) {
            return;
        }
        
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p>Processing your order...</p>';
        document.body.appendChild(loadingIndicator);
        
        // Get form data
        const orderData = getOrderFormData();
        
        // Get pickup and delivery addresses for tracking
        const pickupAddress = document.getElementById('pickup-address').value;
        const deliveryAddress = document.getElementById('delivery-address').value;
        
        // Get the base URL with the correct protocol
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:3001' 
            : window.location.origin;
        
        // Log order data for debugging
        console.log('Submitting order data:', orderData);
        console.log('Using API endpoint:', `${baseUrl}/api/orders`);
        
        // Submit order to API
        fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);
            
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Error response body:', text);
                    try {
                        return Promise.reject(JSON.parse(text));
                    } catch (e) {
                        return Promise.reject(new Error(`Server responded with status ${response.status}: ${text}`));
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            // Remove loading indicator
            document.body.removeChild(loadingIndicator);
            
            if (data.success) {
                // Close modal
                closeModal();
                
                // Store order ID for tracking
                const orderId = data.order.id;
                
                // Show order tracking
                document.getElementById('order-form-container').style.display = 'none';
                document.getElementById('order-tracking-container').style.display = 'block';
                document.getElementById('tracking-order-id').textContent = orderId;
                
                // Update tracking addresses
                document.getElementById('tracking-pickup-address').textContent = pickupAddress;
                document.getElementById('tracking-delivery-address').textContent = deliveryAddress;
                
                // Initialize the tracking map with the addresses
                initTrackingMap(pickupAddress, deliveryAddress);
                
                // Connect to WebSocket for real-time updates
                connectToWebSocket(orderId);
                
                // Simulate order progress (this will be replaced by real updates from WebSocket)
                simulateOrderProgress();
            } else {
                alert('Failed to place order. Please try again.');
            }
        })
        .catch(error => {
            document.body.removeChild(loadingIndicator);
            console.error('Error submitting order:', error);
            alert('An error occurred. Please try again.');
        });
    }
    
    function connectToWebSocket(orderId) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = function() {
            console.log('WebSocket connection established');
            
            // Subscribe to order updates
            socket.send(JSON.stringify({
                type: 'subscribe-to-order',
                orderId: orderId
            }));
        };
        
        socket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'order-update') {
                    updateOrderStatus(data.order);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
        
        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
        
        socket.onclose = function() {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after a delay
            setTimeout(() => connectToWebSocket(orderId), 5000);
        };
    }
    
    function updateOrderStatus(order) {
        console.log('Order update received:', order);
        
        // Update status indicators
        document.getElementById('status-placed').classList.add('active');
        
        if (order.status === 'rider_assigned' || order.status === 'pickup' || order.status === 'delivered') {
            document.getElementById('status-rider-assigned').classList.add('active');
            
            // Update rider info
            if (order.rider) {
                document.getElementById('rider-name').textContent = order.rider.name;
                document.getElementById('rider-phone').textContent = order.rider.phone;
                document.getElementById('rider-rating').textContent = `${order.rider.rating} ★`;
            }
        }
        
        if (order.status === 'pickup' || order.status === 'delivered') {
            document.getElementById('status-pickup').classList.add('active');
            document.getElementById('eta-value').textContent = '15 minutes to delivery';
        }
        
        if (order.status === 'delivered') {
            document.getElementById('status-delivery').classList.add('active');
            document.getElementById('eta-value').textContent = 'Delivered';
            
            // Show delivery completion message
            setTimeout(() => {
                alert('Your delivery has been completed! Thank you for using NYNJ ShanSong.');
            }, 1000);
        }
    }
    
    function useCurrentLocation() {
        // Check if geolocation is supported
        if (navigator.geolocation) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.textContent = 'Getting your location...';
            document.body.appendChild(loadingIndicator);
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Success - would normally convert coordinates to address using geocoding API
                    document.body.removeChild(loadingIndicator);
                    
                    // For demo, just show coordinates
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    document.getElementById('pickup-address').value = `Current Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                    
                    // Update pickup map (placeholder)
                    if (pickupMap) pickupMap.textContent = `Map would show location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                },
                (error) => {
                    // Error
                    document.body.removeChild(loadingIndicator);
                    alert(`Unable to retrieve your location: ${error.message}`);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }
    
    function calculateMockDistance(pickup, delivery) {
        // This is a mock function - in a real app, we would use a mapping API
        // For demo purposes, generate a random distance between 1 and 15 miles
        return (Math.random() * 14 + 1).toFixed(1);
    }
    
    function simulateOrderProgress() {
        // Update rider info
        document.getElementById('rider-name').textContent = 'John Smith';
        document.getElementById('rider-phone').textContent = '(212) 555-1234';
        document.getElementById('rider-rating').textContent = '4.8 ★';
        
        // Update status to "Rider Assigned"
        setTimeout(() => {
            document.getElementById('status-rider-assigned').classList.add('active');
            document.getElementById('eta-value').textContent = '10 minutes to pickup';
            
            // Simulate rider movement on map
            simulateRiderMovement();
            
            // Update status to "Pickup"
            setTimeout(() => {
                document.getElementById('status-pickup').classList.add('active');
                document.getElementById('eta-value').textContent = '15 minutes to delivery';
                
                // Update status to "Delivery"
                setTimeout(() => {
                    document.getElementById('status-delivery').classList.add('active');
                    document.getElementById('eta-value').textContent = 'Delivered';
                    
                    // Show delivery completion message
                    setTimeout(() => {
                        alert('Your delivery has been completed! Thank you for using NYNJ ShanSong.');
                    }, 2000);
                }, 10000); // 10 seconds for delivery
            }, 8000); // 8 seconds for pickup
        }, 5000); // 5 seconds for rider assignment
    }
    
    function simulateRiderMovement() {
        // This would be replaced with actual map updates
        let count = 0;
        const interval = setInterval(() => {
            count++;
            if (trackingMap) trackingMap.textContent = `Rider is moving... Update ${count}`;
            
            if (count >= 20) {
                clearInterval(interval);
            }
        }, 1500); // Update every 1.5 seconds
    }
    
    // Close modal if user clicks outside of it
    window.addEventListener('click', function(event) {
        if (event.target === orderPreviewModal) {
            closeModal();
        }
    });

    // Add to your DOM ready function
    const initMapBtn = document.getElementById('init-map-btn');
    if (initMapBtn) {
        initMapBtn.addEventListener('click', function() {
            const mapElement = document.getElementById('map');
            if (mapElement) {
                // Clear any content
                mapElement.textContent = '';
                // Reinitialize the map
                map = new google.maps.Map(mapElement, {
                    center: { lat: 40.7128, lng: -74.0060 },
                    zoom: 12,
                    disableDefaultUI: true,
                    zoomControl: true
                });
                console.log("Map manually initialized");
            }
        });
    }

    // Check if map is already initialized by the callback
    setTimeout(() => {
        const mapElement = document.getElementById('map');
        if (mapElement && (!map || mapElement.innerHTML.includes('Google Maps will be displayed'))) {
            console.log("Map not initialized by callback, initializing manually");
            initMap();
        }
    }, 1000); // Give the callback a second to work first

    // Add this after your DOM ready event
    document.getElementById('item-size').addEventListener('change', function() {
        const sizeSelect = this;
        const weightSelect = document.getElementById('item-weight');
        
        if (weightSelect) {
            // Auto-select weight based on size
            switch(sizeSelect.value) {
                case 'small':
                    weightSelect.value = 'light';
                    break;
                case 'medium':
                    weightSelect.value = 'medium';
                    break;
                case 'large':
                    weightSelect.value = 'heavy';
                    break;
            }
        }
    });

    // Add a note about size limitations
    const sizeSelect = document.getElementById('item-size');
    if (sizeSelect) {
        const noteElement = document.createElement('div');
        noteElement.className = 'form-note';
        noteElement.textContent = 'Note: We only accept items that can be carried in a backpack or small shopping cart.';
        noteElement.style.color = '#717171';
        noteElement.style.fontSize = '14px';
        noteElement.style.marginTop = '5px';
        
        sizeSelect.parentNode.appendChild(noteElement);
    }
});

// Google Maps integration code to add to app.js

// Initialize Google Maps
function initMap() {
    console.log("initMap function called");
    
    // Create a default map centered on New York
    const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // New York
    
    // Initialize the main map
    const mapElement = document.getElementById('map');
    if (mapElement) {
        // Clear any placeholder text
        mapElement.textContent = '';
        
        map = new google.maps.Map(mapElement, {
            center: defaultLocation,
            zoom: 12,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false
        });
        
        console.log("Main map initialized");
        
        // Initialize directions service and renderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#276EF1',
                strokeWeight: 5
            }
        });
        
        // Create markers
        pickupMarker = new google.maps.Marker({
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#276EF1',
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 10
            },
            visible: false
        });
        
        deliveryMarker = new google.maps.Marker({
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#05944F',
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 10
            },
            visible: false
        });
        
        // Setup autocomplete for address inputs
        const pickupInput = document.getElementById('pickup-address');
        const deliveryInput = document.getElementById('delivery-address');
        
        if (pickupInput && deliveryInput) {
            pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput);
            deliveryAutocomplete = new google.maps.places.Autocomplete(deliveryInput);
            
            // Bind autocomplete to map
            pickupAutocomplete.bindTo('bounds', map);
            deliveryAutocomplete.bindTo('bounds', map);
            
            // Add listeners
            pickupAutocomplete.addListener('place_changed', function() {
                const place = pickupAutocomplete.getPlace();
                if (!place.geometry) return;
                
                // Set marker
                pickupMarker.setPosition(place.geometry.location);
                pickupMarker.setVisible(true);
                
                // Update map
                map.setCenter(place.geometry.location);
                map.setZoom(15);
                
                // Calculate route if both addresses are set
                calculateRoute();
            });
            
            deliveryAutocomplete.addListener('place_changed', function() {
                const place = deliveryAutocomplete.getPlace();
                if (!place.geometry) return;
                
                // Set marker
                deliveryMarker.setPosition(place.geometry.location);
                deliveryMarker.setVisible(true);
                
                // Update map
                map.setCenter(place.geometry.location);
                map.setZoom(15);
                
                // Calculate route if both addresses are set
                calculateRoute();
            });
        }
    }
    
    // Initialize the tracking map if it exists
    const trackingMapElement = document.getElementById('tracking-map');
    if (trackingMapElement) {
        // Clear any placeholder text
        trackingMapElement.textContent = '';
        
        trackingMap = new google.maps.Map(trackingMapElement, {
            center: defaultLocation,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true
        });
        console.log("Tracking map initialized");
    }
}

// Calculate route between pickup and delivery
function calculateRoute() {
    console.log("calculateRoute called");
    
    if (!map || !directionsService || !directionsRenderer) {
        console.error("Map components not initialized");
        return;
    }
    
    const pickupAddress = document.getElementById('pickup-address').value;
    const deliveryAddress = document.getElementById('delivery-address').value;
    
    console.log("Pickup address:", pickupAddress);
    console.log("Delivery address:", deliveryAddress);
    
    if (!pickupAddress || !deliveryAddress) {
        console.log("Missing addresses");
        return;
    }
    
    if (!pickupMarker.getVisible() || !deliveryMarker.getVisible()) {
        console.log("Markers not visible, calculating route using text addresses instead");
        
        const request = {
            origin: pickupAddress,
            destination: deliveryAddress,
            travelMode: google.maps.TravelMode.DRIVING
        };
        
        directionsService.route(request, function(result, status) {
            console.log("Direction service result:", status);
            
            if (status === 'OK') {
                // Make sure directionsRenderer is attached to the map
                directionsRenderer.setMap(map);
                directionsRenderer.setDirections(result);
                
                // Get distance and duration
                const route = result.routes[0];
                if (route && route.legs[0]) {
                    const distance = route.legs[0].distance.text;
                    const duration = route.legs[0].duration.text;
                    
                    const distanceElement = document.getElementById('distance-value');
                    const timeElement = document.getElementById('time-value');
                    
                    if (distanceElement) distanceElement.textContent = distance;
                    if (timeElement) timeElement.textContent = duration;
                    
                    // Update markers to match the geocoded locations
                    if (route.legs[0].start_location) {
                        pickupMarker.setPosition(route.legs[0].start_location);
                        pickupMarker.setVisible(true);
                    }
                    
                    if (route.legs[0].end_location) {
                        deliveryMarker.setPosition(route.legs[0].end_location);
                        deliveryMarker.setVisible(true);
                    }
                    
                    // Fit map to show the entire route
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(route.legs[0].start_location);
                    bounds.extend(route.legs[0].end_location);
                    map.fitBounds(bounds);
                }
            } else {
                console.error('Directions request failed due to ' + status);
                alert('Could not calculate route. Please check the addresses and try again.');
            }
        });
        return;
    }
    
    console.log("Using marker positions for route");
    const request = {
        origin: pickupMarker.getPosition(),
        destination: deliveryMarker.getPosition(),
        travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.route(request, function(result, status) {
        console.log("Direction service result using markers:", status);
        
        if (status === 'OK') {
            // Make sure directionsRenderer is attached to the map
            directionsRenderer.setMap(map);
            directionsRenderer.setDirections(result);
            
            // Get distance and duration
            const route = result.routes[0];
            if (route && route.legs[0]) {
                const distance = route.legs[0].distance.text;
                const duration = route.legs[0].duration.text;
                
                const distanceElement = document.getElementById('distance-value');
                const timeElement = document.getElementById('time-value');
                
                if (distanceElement) distanceElement.textContent = distance;
                if (timeElement) timeElement.textContent = duration;
                
                // Fit map to show the entire route
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(pickupMarker.getPosition());
                bounds.extend(deliveryMarker.getPosition());
                map.fitBounds(bounds);
            }
        } else {
            console.error('Directions request failed due to ' + status);
            alert('Could not calculate route. Please check the addresses and try again.');
        }
    });
}

// Get current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Getting your location...';
    document.body.appendChild(loadingIndicator);
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.body.removeChild(loadingIndicator);
            
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const latLng = new google.maps.LatLng(lat, lng);
            
            // Update map and marker
            map.setCenter(latLng);
            map.setZoom(15);
            pickupMarker.setPosition(latLng);
            pickupMarker.setVisible(true);
            
            // Reverse geocode to get address
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: latLng }, function(results, status) {
                if (status === 'OK' && results[0]) {
                    document.getElementById('pickup-address').value = results[0].formatted_address;
                    calculateRoute();
                } else {
                    document.getElementById('pickup-address').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                }
            });
        },
        (error) => {
            document.body.removeChild(loadingIndicator);
            alert(`Unable to retrieve your location: ${error.message}`);
        },
        { enableHighAccuracy: true }
    );
}

// Add this function to properly initialize the tracking map
function initTrackingMap(pickupAddress, deliveryAddress) {
    console.log("Initializing tracking map");
    
    const trackingMapElement = document.getElementById('tracking-map');
    if (!trackingMapElement) {
        console.error("Tracking map element not found");
        return;
    }
    
    // Clear any placeholder text
    trackingMapElement.textContent = '';
    
    // Default to New York if no coordinates
    const defaultLocation = { lat: 40.7128, lng: -74.0060 };
    
    // Initialize the map
    const map = new google.maps.Map(trackingMapElement, {
        center: defaultLocation,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true
    });
    
    // Create markers for pickup and delivery
    const pickupMarker = new google.maps.Marker({
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#276EF1',
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 10
        }
    });
    
    const deliveryMarker = new google.maps.Marker({
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#05944F',
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 10
        }
    });
    
    // Geocode the addresses to get coordinates
    const geocoder = new google.maps.Geocoder();
    
    // Geocode pickup address
    geocoder.geocode({ address: pickupAddress }, function(results, status) {
        if (status === 'OK' && results[0]) {
            pickupMarker.setPosition(results[0].geometry.location);
            
            // Geocode delivery address
            geocoder.geocode({ address: deliveryAddress }, function(results, status) {
                if (status === 'OK' && results[0]) {
                    deliveryMarker.setPosition(results[0].geometry.location);
                    
                    // Create a bounds object
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(pickupMarker.getPosition());
                    bounds.extend(deliveryMarker.getPosition());
                    
                    // Fit the map to show both markers
                    map.fitBounds(bounds);
                    
                    // Draw a route between the markers
                    const directionsService = new google.maps.DirectionsService();
                    const directionsRenderer = new google.maps.DirectionsRenderer({
                        map: map,
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: '#276EF1',
                            strokeWeight: 5
                        }
                    });
                    
                    directionsService.route({
                        origin: pickupMarker.getPosition(),
                        destination: deliveryMarker.getPosition(),
                        travelMode: google.maps.TravelMode.DRIVING
                    }, function(response, status) {
                        if (status === 'OK') {
                            directionsRenderer.setDirections(response);
                        }
                    });
                }
            });
        }
    });
}

// Function to validate the order form
function validateOrderForm() {
    // Required fields
    const requiredFields = [
        'sender-name', 'sender-phone', 
        'receiver-name', 'receiver-phone',
        'pickup-address', 'delivery-address',
        'item-type', 'item-size'
    ];
    
    let isValid = true;
    
    // Check each required field
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            isValid = false;
            // Add error styling
            if (field) {
                field.classList.add('error');
                // Add error message if not already present
                const errorMsg = field.parentNode.querySelector('.error-message');
                if (!errorMsg) {
                    const msg = document.createElement('div');
                    msg.className = 'error-message';
                    msg.textContent = 'This field is required';
                    field.parentNode.appendChild(msg);
                }
            }
        } else if (field) {
            // Remove error styling
            field.classList.remove('error');
            // Remove error message if present
            const errorMsg = field.parentNode.querySelector('.error-message');
            if (errorMsg) {
                field.parentNode.removeChild(errorMsg);
            }
        }
    });
    
    // Check if addresses are valid
    const pickupAddress = document.getElementById('pickup-address').value;
    const deliveryAddress = document.getElementById('delivery-address').value;
    
    if (pickupAddress === deliveryAddress && isValid) {
        alert('Pickup and delivery addresses cannot be the same');
        isValid = false;
    }
    
    return isValid;
}

// Function to get form data
function getOrderFormData() {
    // Get form values
    const senderName = document.getElementById('sender-name').value;
    const senderPhone = document.getElementById('sender-phone').value;
    const receiverName = document.getElementById('receiver-name').value;
    const receiverPhone = document.getElementById('receiver-phone').value;
    const itemType = document.getElementById('item-type').value;
    const itemSize = document.getElementById('item-size').value;
    const itemWeight = document.getElementById('item-weight') ? document.getElementById('item-weight').value : '';
    const specialRequirements = document.getElementById('special-requirements').value;
    const pickupAddress = document.getElementById('pickup-address').value;
    const deliveryAddress = document.getElementById('delivery-address').value;
    
    // Get distance and time values
    const distance = document.getElementById('distance-value').textContent;
    const estimatedTime = document.getElementById('time-value').textContent;
    
    // Calculate price (simple formula based on distance)
    const distanceValue = parseFloat(distance.replace(/[^0-9.]/g, '')) || 0;
    const price = (10 + (distanceValue * 2)).toFixed(2);
    
    // Get uploaded files
    const urlsInput = document.getElementById('uploaded-urls');
    const attachments = urlsInput ? JSON.parse(urlsInput.value || '[]') : [];
    
    // Create order object
    return {
        ' Sender Name ': senderName,
        ' Sender Phone ': senderPhone,
        ' Receiver Name ': receiverName,
        ' Receiver Phone ': receiverPhone,
        ' Pickup Address ': pickupAddress,
        ' Delivery Address ': deliveryAddress,
        ' Item Type ': itemType,
        ' Item Size ': itemSize,
        ' Item Weight ': itemWeight || '',
        ' Special Requirements ': specialRequirements || '',
        ' Distance ': distanceValue.toString(),
        ' Estimated Time ': estimatedTime.replace(/[^0-9]/g, ''),
        ' Price ': '$' + price,
        ' Status ': 'Placed',
        ' Created At ': new Date().toISOString(),
        ' Payment Status ': 'Unpaid',
        ' Payment Method ': '',
        'attachments': attachments  // Include the file URLs
    };
} 