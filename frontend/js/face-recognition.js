// Face Recognition System for Umuganda Attendance

class FaceRecognitionSystem {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.faceApiLoaded = false;
        this.faceDescriptors = new Map();
        this.isProcessing = false;
        this.models = null;
    }

    // Initialize face recognition system
    async initialize() {
        try {
            // Load face-api.js models
            await this.loadFaceApiModels();
            this.faceApiLoaded = true;
            console.log('Face recognition system initialized');
        } catch (error) {
            console.error('Failed to initialize face recognition:', error);
            throw error;
        }
    }

    // Load face-api.js models
    async loadFaceApiModels() {
        try {
            // In a real implementation, you would load actual models
            // For this demo, we'll simulate the loading
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.models = {
                faceDetectionNet: true,
                faceLandmark68Net: true,
                faceRecognitionNet: true
            };
            console.log('Face API models loaded successfully');
        } catch (error) {
            console.error('Failed to load face API models:', error);
            throw error;
        }
    }

    // Start camera stream
    async startCamera(videoElement) {
        try {
            this.video = videoElement;
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            this.video.srcObject = this.stream;
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
        } catch (error) {
            console.error('Failed to start camera:', error);
            throw error;
        }
    }

    // Stop camera stream
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
    }

    // Capture photo from video
    capturePhoto() {
        if (!this.video) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        return canvas.toDataURL('image/jpeg');
    }

    // Detect faces in image
    async detectFaces(imageData) {
        if (!this.faceApiLoaded) {
            throw new Error('Face recognition system not initialized');
        }

        try {
            // Store image data for consistent descriptor generation
            this.lastImageData = imageData;
            
            // Simulate face detection
            // In real implementation, you would use face-api.js
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Return mock face detection result
            return [{
                detection: {
                    _box: {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 200
                    }
                },
                landmarks: {
                    getJawOutline: () => [],
                    getNose: () => [],
                    getMouth: () => [],
                    getLeftEye: () => [],
                    getRightEye: () => []
                },
                descriptor: this.generateMockDescriptor()
            }];
        } catch (error) {
            console.error('Face detection failed:', error);
            throw error;
        }
    }

    // Generate mock face descriptor (for demo purposes)
    generateMockDescriptor() {
        // Create a consistent descriptor based on image data hash
        // This simulates real face recognition where same face = same descriptor
        const seed = this.hashCode(JSON.stringify(this.lastImageData || ''));
        const random = this.seededRandom(seed);
        return Array.from({length: 128}, () => random());
    }

    // Simple hash function for consistent seed generation
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Seeded random number generator
    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    // Register citizen with face data
    async registerCitizen(citizenData, imageData) {
        try {
            const faces = await this.detectFaces(imageData);
            
            if (faces.length === 0) {
                throw new Error('No face detected in the image');
            }

            if (faces.length > 1) {
                throw new Error('Multiple faces detected. Please provide an image with only one face.');
            }

            const faceDescriptor = faces[0].descriptor;
            const citizenId = citizenData.id || citizenData.nationalId;
            
            // Store face descriptor with image data
            this.faceDescriptors.set(citizenId, {
                descriptor: faceDescriptor,
                citizenData: citizenData,
                imageData: imageData,
                registeredAt: new Date().toISOString()
            });

            // Save to localStorage for persistence
            this.saveFaceDatabase();
            
            console.log(`Citizen ${citizenData.name} registered successfully with face data`);
            
            return {
                success: true,
                citizenId: citizenId,
                message: 'Citizen registered successfully with face recognition'
            };
        } catch (error) {
            console.error('Citizen registration failed:', error);
            throw error;
        }
    }

    // Recognize face from captured image
    async recognizeFace(imageData) {
        if (!this.faceApiLoaded) {
            throw new Error('Face recognition system not initialized');
        }

        try {
            console.log('Starting face recognition...');
            console.log('Face database size:', this.faceDescriptors.size);
            
            const faces = await this.detectFaces(imageData);
            
            if (faces.length === 0) {
                return {
                    success: false,
                    message: 'No face detected'
                };
            }

            if (faces.length > 1) {
                return {
                    success: false,
                    message: 'Multiple faces detected'
                };
            }

            const capturedDescriptor = faces[0].descriptor;
            console.log('Captured face descriptor length:', capturedDescriptor.length);
            
            // Find best match in database
            let bestMatch = null;
            let bestSimilarity = 0;
            let bestDistance = Infinity;
            
            console.log('Searching through face database...');
            for (const [citizenId, storedData] of this.faceDescriptors) {
                const distance = this.calculateFaceDistance(capturedDescriptor, storedData.descriptor);
                const similarity = this.calculateSimilarity(capturedDescriptor, storedData.descriptor);
                console.log(`Distance for ${citizenId}: ${distance.toFixed(4)}, Similarity: ${similarity.toFixed(4)}`);
                
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestDistance = distance;
                    bestMatch = {
                        citizenId: citizenId,
                        citizenData: storedData.citizenData,
                        distance: distance,
                        similarity: similarity
                    };
                }
            }

            console.log('Best match:', bestMatch);
            console.log('Best distance:', bestDistance);
            console.log('Best similarity:', bestSimilarity);

            // Threshold for face recognition (using similarity instead of distance)
            const RECOGNITION_THRESHOLD = 0.3; // 30% similarity threshold
            
            if (bestMatch && bestMatch.similarity > RECOGNITION_THRESHOLD) {
                console.log('Face recognized successfully!');
                return {
                    success: true,
                    citizen: bestMatch.citizenData,
                    confidence: bestMatch.similarity,
                    citizenId: bestMatch.citizenId,
                    distance: bestMatch.distance
                };
            } else {
                console.log('Face not recognized');
                return {
                    success: false,
                    message: 'Face not recognized. Citizen not registered.',
                    bestMatch: bestMatch,
                    threshold: RECOGNITION_THRESHOLD,
                    actualSimilarity: bestSimilarity
                };
            }
        } catch (error) {
            console.error('Face recognition failed:', error);
            throw error;
        }
    }

    // Calculate Euclidean distance between face descriptors
    calculateFaceDistance(descriptor1, descriptor2) {
        let sum = 0;
        for (let i = 0; i < descriptor1.length; i++) {
            const diff = descriptor1[i] - descriptor2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    // Calculate similarity score (0-1, where 1 is perfect match)
    calculateSimilarity(descriptor1, descriptor2) {
        const distance = this.calculateFaceDistance(descriptor1, descriptor2);
        // Convert distance to similarity (inverse relationship)
        const maxDistance = Math.sqrt(descriptor1.length * 4); // Maximum possible distance
        const similarity = Math.max(0, 1 - (distance / maxDistance));
        return similarity;
    }

    // Save face database to localStorage
    saveFaceDatabase() {
        const db = {};
        for (const [citizenId, data] of this.faceDescriptors) {
            db[citizenId] = data;
        }
        localStorage.setItem('faceRecognitionDB', JSON.stringify(db));
    }

    // Load face database from localStorage
    loadFaceDatabase() {
        const stored = localStorage.getItem('faceRecognitionDB');
        if (stored) {
            try {
                const db = JSON.parse(stored);
                this.faceDescriptors = new Map(Object.entries(db));
                console.log(`Loaded ${this.faceDescriptors.size} face records from database`);
            } catch (error) {
                console.error('Failed to load face database:', error);
            }
        }
    }

    // Get all registered citizens
    getRegisteredCitizens() {
        const citizens = [];
        for (const [citizenId, data] of this.faceDescriptors) {
            citizens.push({
                id: citizenId,
                ...data.citizenData,
                registeredAt: data.registeredAt
            });
        }
        return citizens;
    }

    // Delete citizen from face database
    deleteCitizen(citizenId) {
        if (this.faceDescriptors.has(citizenId)) {
            this.faceDescriptors.delete(citizenId);
            this.saveFaceDatabase();
            return true;
        }
        return false;
    }

    // Check if system is ready
    isReady() {
        return this.faceApiLoaded;
    }

    // Get stored image for a citizen
    getCitizenImage(citizenId) {
        if (this.faceDescriptors.has(citizenId)) {
            return this.faceDescriptors.get(citizenId).imageData;
        }
        return null;
    }

    // View all stored images (for debugging)
    viewAllStoredImages() {
        console.log('=== STORED FACE IMAGES ===');
        for (const [citizenId, data] of this.faceDescriptors) {
            console.log(`${citizenId}: ${data.citizenData.name}`);
            console.log(`Image data length: ${data.imageData.length} characters`);
            console.log(`Registered: ${data.registeredAt}`);
            console.log('---');
        }
        console.log(`Total stored images: ${this.faceDescriptors.size}`);
        console.log('=== END STORED IMAGES ===');
    }

    // Export face database with images (for backup)
    exportFaceDatabase() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            citizens: []
        };

        for (const [citizenId, data] of this.faceDescriptors) {
            exportData.citizens.push({
                citizenId: citizenId,
                citizenData: data.citizenData,
                imageData: data.imageData,
                descriptor: data.descriptor,
                registeredAt: data.registeredAt
            });
        }

        return exportData;
    }

    // Import face database with images
    importFaceDatabase(exportData) {
        try {
            if (!exportData || !exportData.citizens) {
                throw new Error('Invalid export data format');
            }

            this.faceDescriptors.clear();
            
            for (const citizen of exportData.citizens) {
                this.faceDescriptors.set(citizen.citizenId, {
                    descriptor: citizen.descriptor,
                    citizenData: citizen.citizenData,
                    imageData: citizen.imageData,
                    registeredAt: citizen.registeredAt
                });
            }

            this.saveFaceDatabase();
            console.log(`Imported ${exportData.citizens.length} citizens successfully`);
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
}

// Global instance
let faceRecognitionSystem = null;

// Initialize face recognition system
async function initializeFaceRecognition() {
    if (!faceRecognitionSystem) {
        faceRecognitionSystem = new FaceRecognitionSystem();
        await faceRecognitionSystem.initialize();
        faceRecognitionSystem.loadFaceDatabase();
    }
    return faceRecognitionSystem;
}

// Utility functions for camera operations
async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Camera permission denied:', error);
        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FaceRecognitionSystem, initializeFaceRecognition };
}
