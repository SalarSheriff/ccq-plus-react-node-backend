const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,  // Encrypt the connection
        enableArithAbort: true  // Required for compatibility
    },
    pool: {
        max: 10,  // Maximum number of connections in the pool
        min: 0,   // Minimum number of connections in the pool (can scale down to 0 when idle)
        idleTimeoutMillis: 30000  // Close idle connections after 30 seconds
    }
}

module.exports = dbConfig;
