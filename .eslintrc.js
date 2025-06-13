module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script", // Changed from 'module' to 'script' for HTML inline scripts
  },
  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": "off", // Allow console.log for now
    "no-debugger": "error",
    "no-undef": "off", // Disable undefined variable errors for global variables
  },
};
