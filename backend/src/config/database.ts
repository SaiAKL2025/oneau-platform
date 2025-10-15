import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    console.log('🚀 NEW DATABASE CONNECTION CODE LOADED');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneau_platform';
    
    if (!mongoURI || mongoURI === 'mongodb://localhost:27017/oneau_platform') {
      console.log('❌ No MongoDB URI provided, skipping database connection');
      return;
    }

    console.log('🔄 Attempting MongoDB connection...');
    let finalURI = mongoURI;
    console.log('🔍 Final URI (masked):', finalURI.replace(/:([^@]+)@/, ':*****@'));

    // Add authSource=admin if missing (common issue with MongoDB Atlas)
    if (!finalURI.includes('authSource=')) {
      const separator = finalURI.includes('?') ? '&' : '?';
      finalURI = finalURI + separator + 'authSource=admin';
      console.log('🔧 Added authSource=admin to URI');
    }

    // Configure mongoose options for serverless environment
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 10000, // 10 seconds socket timeout
      connectTimeoutMS: 5000, // 5 seconds connection timeout
      maxPoolSize: 1, // Single connection for serverless
      minPoolSize: 0, // No minimum connections
      maxIdleTimeMS: 30000, // 30 seconds idle timeout
      bufferCommands: false, // Disable mongoose buffering
      retryWrites: true, // Enable retryable writes
      directConnection: false, // Use replica set connection
      heartbeatFrequencyMS: 10000 // 10 seconds heartbeat
    };

        // Try connection with timeout and retry logic
        let retries = 3;
        let conn: any;

        while (retries > 0) {
          try {
            console.log(`🔄 MongoDB connection attempt ${4 - retries}/3...`);
            
            // Add timeout wrapper to prevent hanging
            const connectionPromise = mongoose.connect(finalURI, options);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout after 8 seconds')), 8000)
            );
            
            conn = await Promise.race([connectionPromise, timeoutPromise]);
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