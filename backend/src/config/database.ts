import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneau_platform';
    
    console.log('🔍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('🔍 MONGODB_URI value:', mongoURI ? 'SET' : 'NOT SET');
    
    if (!mongoURI || mongoURI === 'mongodb://localhost:27017/oneau_platform') {
      console.log('❌ No MongoDB URI provided, skipping database connection');
      return;
    }

    // Use the MongoDB URI as provided
    let finalURI = mongoURI;

    // Configure mongoose options for better connection handling
    const options = {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 30000, // Close sockets after 30 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      maxPoolSize: 1, // Maintain only 1 socket connection for serverless
      minPoolSize: 0, // No minimum connections for serverless
      maxIdleTimeMS: 10000, // Close connections after 10 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      retryWrites: true // Enable retryable writes
    };

    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(finalURI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
  } catch (error: any) {
    console.error('❌ Database connection error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.log('⚠️ Continuing without database connection - will use mock data');
    // Don't exit process, just log the error and continue
  }
};

export default connectDB;