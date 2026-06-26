const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/enigma_notes', {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Database connection warning: ${error.message}`);
    console.warn('MongoDB not available. Falling back to clean JSON File Mock DB (local file db.json)...');
    global.useMockDB = true;
  }
};

module.exports = connectDB;
