// tests/teardown.js
// ------------------
// Jest globalTeardown — runs ONCE after all test suites finish.
// Stops the in-memory MongoDB server that was started in setup.js.

module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
};
