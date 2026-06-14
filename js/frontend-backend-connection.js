// Frontend-Backend Connection Example
// This file demonstrates how to connect frontend with your backend services
// Using your Cloudinary URL and MongoDB URL from .env file

// Configuration loaded from config.js
console.log('Frontend-Backend Connection Example');
console.log('=====================================');

// 1. API Service Class
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.cloudinary = CONFIG.CLOUDINARY; // Your Cloudinary config
    }

    // 2. Home Updates API
    async getHomeUpdates() {
        try {
            const response = await fetch(`${this.baseURL}/home-updates`);
            if (!response.ok) throw new Error('Failed to fetch home updates');
            return await response.json();
        } catch (error) {
            console.error('Error fetching home updates:', error);
            return [];
        }
    }

    async createHomeUpdate(updateData, imageFile) {
        try {
            const formData = new FormData();
            
            // Add text fields
            Object.keys(updateData).forEach(key => {
                formData.append(key, updateData[key]);
            });
            
            // Add image file if provided
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            const response = await fetch(`${this.baseURL}/home-updates`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to create home update');
            return await response.json();
        } catch (error) {
            console.error('Error creating home update:', error);
            throw error;
        }
    }

    // 3. Image Upload to Cloudinary
    async uploadImageToCloudinary(imageFile) {
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', 'umuganda_updates');
            
            const response = await fetch(`${this.cloudinary.URL}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to upload to Cloudinary');
            const result = await response.json();
            return result.secure_url; // Return the Cloudinary URL
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    }

    // 4. Complete Example Usage
    async createHomeUpdateWithCloudinaryImage(formData, imageFile) {
        let imageUrl = null;
        
        if (imageFile) {
            // Upload to Cloudinary first
            imageUrl = await this.uploadImageToCloudinary(imageFile);
        }
        
        const updateData = {
            ...formData,
            image: imageUrl,
            imageName: imageFile.name
        };
        
        return await this.createHomeUpdate(updateData);
    }
}

// 5. Usage Example
document.addEventListener('DOMContentLoaded', async () => {
    const api = new ApiService();
    
    try {
        // Example: Get home updates from backend
        const homeUpdates = await api.getHomeUpdates();
        console.log('Home updates from backend:', homeUpdates);
        
        // Example: Create new update with image
        const form = document.getElementById('homeUpdateForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    type: 'activity',
                    title: 'Test Activity',
                    description: 'This is a test activity',
                    place: 'Test Location',
                    date: new Date().toISOString().split('T')[0],
                    postedBy: 'Test Leader'
                };
                
                const imageInput = document.getElementById('homeUpdateImage');
                const imageFile = imageInput ? imageInput.files[0] : null;
                
                try {
                    const result = await api.createHomeUpdateWithCloudinaryImage(formData, imageFile);
                    console.log('Home update created:', result);
                    alert('Home update created successfully!');
                } catch (error) {
                    console.error('Error creating home update:', error);
                    alert('Error creating home update: ' + error.message);
                }
            });
        }
        
    } catch (error) {
        console.error('Error initializing frontend:', error);
    }
});

// 6. Configuration Summary
console.log('Your Configuration:');
console.log('- Backend URL:', CONFIG.API_BASE_URL);
console.log('- Cloudinary URL:', CONFIG.CLOUDINARY.URL);
console.log('- Cloudinary Cloud Name:', CONFIG.CLOUDINARY.CLOUD_NAME);
console.log('- MongoDB URL:', CONFIG.MONGODB.URL);
console.log('');
console.log('This setup allows your frontend to:');
console.log('1. Connect to your backend API at', CONFIG.API_BASE_URL);
console.log('2. Upload images directly to your Cloudinary account');
console.log('3. Store data in your MongoDB database');
console.log('4. Use real-time data synchronization');
console.log('');
console.log('To use this in your application:');
console.log('1. Include this script in your HTML: <script src="frontend-backend-connection.js"></script>');
console.log('2. Make sure config.js is loaded first');
console.log('3. Use the ApiService class for all API calls');
console.log('4. Handle image uploads with Cloudinary integration');
