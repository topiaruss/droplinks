module.exports = async function globalTeardown() {
  console.log('Tearing down global test environment...');
  // Global teardown for Playwright tests
  // You can clean up test databases, stop servers, etc. here
};