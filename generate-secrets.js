const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('REFRESH_TOKEN_SECRET=' + crypto.randomBytes(32).toString('hex')); 