import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneau_platform';
    
    console.log('🔍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('🔍 MONGODB_URI value:', mongoURI ? 'SET' : 'NOT SET');
    console.log('🔍 MONGODB_URI preview:', mongoURI ? mongoURI.substring(0, 50) + '...' : 'NOT SET');
    
    if (!mongoURI || mongoURI === 'mongodb://localhost:27017/oneau_platform') {
      console.log('❌ No MongoDB URI provided, skipping database connection');
      return;
    }

    // TEMPORARY: Force connection attempt even if it might fail
    console.log('🔄 Forcing MongoDB connection attempt...');

    // Use the MongoDB URI as provided
    let finalURI = mongoURI;
    
    // Use the MongoDB URI as provided without modification
    // The URI already contains all necessary parameters
    console.log('🔍 Using MongoDB URI as provided (no modifications needed)');
    console.log('🔍 Full URI length:', finalURI.length);
    console.log('🔍 URI contains retryWrites:', finalURI.includes('retryWrites'));
    console.log('🔍 URI contains w=', finalURI.includes('w='));
    console.log('🔍 URI contains authSource=', finalURI.includes('authSource'));
    
    // Check for duplicate retryWrites
    const retryWritesMatches = finalURI.match(/retryWrites=/g);
    if (retryWritesMatches && retryWritesMatches.length > 1) {
      console.log('❌ DUPLICATE retryWrites found:', retryWritesMatches.length, 'times');
      console.log('❌ URI preview:', finalURI.substring(0, 100) + '...');
    } else {
      console.log('✅ No duplicate retryWrites found');
    }

    // Configure mongoose options for better connection handling
    const options = {
      serverSelectionTimeoutMS: 3000, // Keep trying to send operations for 3 seconds
      socketTimeoutMS: 20000, // Close sockets after 20 seconds of inactivity
      connectTimeoutMS: 5000, // Give up initial connection after 5 seconds
      maxPoolSize: 1, // Maintain only 1 socket connection for serverless
      minPoolSize: 0, // No minimum connections for serverless
      maxIdleTimeMS: 5000, // Close connections after 5 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      retryWrites: true, // Enable retryable writes
      directConnection: false // Use replica set connection
    };

        console.log('Attempting to connect to MongoDB...');
        console.log('🔍 Final URI preview:', finalURI.substring(0, 50) + '...');

        // Try connection with retry logic
        let retries = 3;
        let conn: any;

        while (retries > 0) {
          try {
            console.log(`🔄 Connection attempt ${4 - retries}/3...`);
            conn = await mongoose.connect(finalURI, options);
            console.log('✅ MongoDB connection successful!');
            break;
          } catch (error: any) {
            retries--;
            console.log(`❌ Connection attempt failed, retries left: ${retries}`);
            console.log(`❌ Error: ${error.message}`);
            if (retries === 0) throw error;
            console.log('⏳ Waiting 2 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
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