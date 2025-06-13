// Jest setup file
const { TextEncoder, TextDecoder } = require('util');

// Make TextEncoder and TextDecoder available globally
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};