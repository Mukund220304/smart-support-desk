// db.js
// -----
// Manages the Mongoose connection to MongoDB.
// Called once at server startup. All models share this single connection.

const mongoose = require('mongoose');

/**
 * connectDB()
 * Reads MONGO_URI from the environment and opens a Mongoose connection.
 * Throws if the URI is missing or the connection fails — this lets server.js
 * catch the error and exit cleanly rather than starting with no database.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Check your .env file.');
  }

  // Mongoose 8+ no longer needs useNewUrlParser / useUnifiedTopology options.
  await mongoose.connect(uri);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDB;
