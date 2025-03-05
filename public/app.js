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
    function handleFileUpload(files) {
        if (!files.length) return;
        
        // Get existing files count
        const existingFiles = imagePreview.querySelectorAll('img, .file-icon').length;
        const totalFiles = existingFiles + files.length;
        
        // Check if exceeding max files (5)
        if (totalFiles > 5) {
            alert('You can upload a maximum of 5 files. Please remove some files and try again.');
            return;
        }
        
        // Create success message
        const successMessage = document.createElement('div');
        successMessage.className = 'upload-success';
        successMessage.innerHTML = '✅ File uploaded successfully';
        
        // Create image preview
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Create file container
            const fileContainer = document.createElement('div');
            fileContainer.className = 'file-container';
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                fileContainer.remove();
                updateUploadButtonState();
            });
            
            // Only process image files
            if (!file.type.match('image.*')) {
                const fileIcon = document.createElement('div');
                fileIcon.className = 'file-icon';
                fileIcon.innerHTML = '📄 ' + file.name;
                
                fileContainer.appendChild(fileIcon);
                fileContainer.appendChild(removeBtn);
                imagePreview.appendChild(fileContainer);
                continue;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.title = file.name;
                img.className = 'uploaded-image';
                
                fileContainer.appendChild(img);
                fileContainer.appendChild(removeBtn);
                imagePreview.appendChild(fileContainer);
            };
            
            reader.readAsDataURL(file);
        }
        
        // Add success message
        imagePreview.appendChild(successMessage);
        
        // Update upload button state
        updateUploadButtonState();
        
        // Remove success message after 3 seconds
        setTimeout(() => {
            const successMessages = imagePreview.querySelectorAll('.upload-success');
            successMessages.forEach(msg => msg.remove());
        }, 3000);
    }
    
    // Update upload button state based on file count
    function updateUploadButtonState() {
        const fileCount = imagePreview.querySelectorAll('.file-container').length;
        
        if (fileCount >= 5) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="upload-icon">🚫</span> Max Files Reached (5)';
        } else {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<span class="upload-icon">📷</span> Upload Image or Bill';
        }
        
        // Show file count if any files are uploaded
        if (fileCount > 0) {
            const countLabel = document.createElement('div');
            countLabel.className = 'file-count';
            countLabel.textContent = `${fileCount}/5 files uploaded`;
            
            // Remove existing count label if any
            const existingLabel = imagePreview.querySelector('.file-count');
            if (existingLabel) {
                existingLabel.remove();
            }
            
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
        `;
        
        // Update modal content and show it
        previewContent.innerHTML = previewHTML;
        orderPreviewModal.style.display = 'block';
        
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
        
        // Create order object
        const orderData = {
            senderName,
            senderPhone,
            receiverName,
            receiverPhone,
            itemType,
            itemSize,
            itemWeight,
            specialRequirements,
            pickupAddress,
            deliveryAddress,
            distance: distanceValue,
            estimatedTime: estimatedTime.replace(/[^0-9]/g, ''),
            price
        };
        
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = 'Processing your order...';
        document.body.appendChild(loadingIndicator);
        
        // Submit order to API
        fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
        .then(response => response.json())
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
        const wsUrl = `${protocol}//${window.location.host}`;
        
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