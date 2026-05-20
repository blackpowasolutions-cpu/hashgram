const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Block base64id temp directories (created by socket.io-client on startup) from
// being watched by Metro's file watcher — they get deleted before Metro can
// observe them, which causes a ENOENT crash.
const existingBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  /node_modules\/.*\/base64id_tmp_\d+.*/,
];

module.exports = config;
