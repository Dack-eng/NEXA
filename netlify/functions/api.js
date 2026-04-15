const serverless = require('serverless-http');
const handler = require('../../src/server-runtime');

module.exports.handler = serverless(handler);
