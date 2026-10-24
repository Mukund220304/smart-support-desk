// tests/dbHelper.js
// -----------------
// Helper for managing the in-memory MongoDB server during automated tests.
// Ensures all Jest tests run in an isolated in-memory environment and NEVER
// touch or modify your real production / Atlas database.

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

/**
 * connectTestDB
 * Starts an in-memory MongoDB instance and connects Mongoose to it.
 */
async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

/**
 * clearTestDB
 * Cleans out all collections between tests to keep each test isolated.
 */
async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}

/**
 * closeTestDB
 * Disconnects Mongoose and stops the in-memory MongoDB server.
 */
async function closeTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}

module.exports = {
  connectTestDB,
  clearTestDB,
  closeTestDB,
};
