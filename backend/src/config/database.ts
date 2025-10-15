import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneau_platform';
    
    if (!mongoURI || mongoURI === 'mongodb://localhost:27017/oneau_platform') {
      console.log('❌ No MongoDB URI provided, skipping database connection');
      return;
    }

    console.log('🔄 Attempting MongoDB connection...');
    let finalURI = mongoURI;

    // Add authSource=admin if missing (common issue with MongoDB Atlas)
    if (!finalURI.includes('authSource=')) {
      const separator = finalURI.includes('?') ? '&' : '?';
      finalURI = finalURI + separator + 'authSource=admin';
      console.log('🔧 Added authSource=admin to URI');
    }

    // Configure mongoose options for better connection handling
    const options = {
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 30000, // Increased to 30 seconds
      connectTimeoutMS: 10000, // Increased to 10 seconds
      maxPoolSize: 1, // Maintain only 1 socket connection for serverless
      minPoolSize: 0, // No minimum connections for serverless
      maxIdleTimeMS: 5000, // Close connections after 5 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      retryWrites: true, // Enable retryable writes
      directConnection: false // Use replica set connection
    };

        // Try connection with retry logic
        let retries = 3;
        let conn: any;

        while (retries > 0) {
          try {
            console.log(`🔄 MongoDB connection attempt ${4 - retries}/3...`);
            conn = await mongoose.connect(finalURI, options);
            console.log('✅ MongoDB connection successful!');
            break;
          } catch (error: any) {
            retries--;
            console.log(`❌ MongoDB connection failed (${retries} retries left)`);
            console.log(`❌ Error: ${error.message}`);
            if (retries === 0) {
              console.log(`❌ Final error details: ${error.constructor.name} - ${error.message}`);
              throw error;
            }
            console.log('⏳ Retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

    if (conn) {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`✅ Database: ${conn.connection.name}`);
    }
  } catch (error: any) {
    console.error('❌ Database connection error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.log('⚠️ Continuing without database connection - will use mock data');
    // Don't exit process, just log the error and continue
  }
};

export default connectDB;