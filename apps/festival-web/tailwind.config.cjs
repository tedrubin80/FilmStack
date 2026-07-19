const sharedConfig = require('@filmstack/shared-config/tailwind.config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};
