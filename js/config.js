// Configuration file for frontend-backend connection
const CONFIG = {
    // Backend API URL
    API_BASE_URL: 'https://backen-community-level-servece-delivery-system-production.up.railway.app/api',
    
    // Cloudinary Configuration
    CLOUDINARY: {
        URL: 'cloudinary://847888554347783:8nHJeoLV2D0LuMg9d-XKVwxsZqM@djupysjug',
        CLOUD_NAME: 'djupysjug',
        API_KEY: '847888554347783',
        API_SECRET: '8nHJeoLV2D0LuMg9d-XKVwxsZqM'
    },
    
    // MongoDB Configuration
    MONGODB: {
        URL: 'mongodb+srv://claudeniyomugabo2025:<claude@97>@cluster0.azog0ei.mongodb.net/?appName=Cluster0'
    },
    
    // Upload Configuration
    UPLOAD: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    }
};

// Export configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
