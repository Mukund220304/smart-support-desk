// tests/setup.js
// ---------------
// Jest globalSetup — runs ONCE before any test suite.
// Starts an in-memory MongoDB instance using mongodb-memory-server and
// writes its URI into process.env so all test files connect to it
// instead of your real database.
//
// Why mongodb-memory-server?
//   - No MongoDB installation needed on CI.
//   - Each test run starts with a clean, empty database.
//   - Tests can run offline.

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async () => {
  // Start the in-memory MongoDB server
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Store the URI and the server instance so teardown.js can clean up
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';

  // Attach to global so teardown.js can stop the server
  global.__MONGOD__ = mongod;
};
