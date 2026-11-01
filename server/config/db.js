const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri) {
      try {
        console.log('Attempting to connect to specified MONGO_URI...');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
        console.log(`✓ Connected to MongoDB at: ${mongoUri.replace(/:([^:@]{1,})@/, ':****@')}`);
        return;
      } catch (err) {
        console.warn('⚠️ Could not connect to configured MONGO_URI:', err.message);
        if (process.env.NODE_ENV === 'production') {
          throw err;
        }
        console.log('Falling back to local in-memory MongoDB for development/demonstration...');
      }
    }

    // Dev fallback: MongoDB Memory Server
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const uri = mongodInstance.getUri();
    await mongoose.connect(uri);
    console.log(`✓ Connected to in-memory MongoDB for local dev at: ${uri}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
