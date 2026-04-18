const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 handles these options automatically
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Retry after 5 seconds
    console.log('Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB error: ${err}`);
});

module.exports = connectDB;
