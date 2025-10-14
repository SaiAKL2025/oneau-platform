import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  // Skip database connection in serverless environments
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    console.log('Skipping database connection in serverless environment');
    return;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneau_platform';
    
    // Use the MongoDB URI as provided
    let finalURI = mongoURI;

    // Configure mongoose options for better connection handling
    const options = {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain a minimum of 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
    };

    const conn = await mongoose.connect(finalURI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Database connection error:', error);
    // Don't exit process in serverless environment, just log the error
    if (process.env.VERCEL === '1') {
      console.log('Running in serverless environment - continuing without database connection');
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;