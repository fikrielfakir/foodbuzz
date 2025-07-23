const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add this resolver configuration
config.resolver.assetExts.push('db');

module.exports = config;