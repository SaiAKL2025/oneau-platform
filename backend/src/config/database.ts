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
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 15000, // Give up initial connection after 15 seconds
      maxPoolSize: 5, // Maintain up to 5 socket connections
      minPoolSize: 1, // Maintain a minimum of 1 socket connection
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
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