import dotenv from 'dotenv';
dotenv.config();





const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: "10.114.163.22",
    port: 1433,
    database: process.env.DB_DATABASE,
   
    options: {
        encrypt: false,  // Encrypt the connection. DISABLE FOR SELF SIGNED CERTIFICATES
        enableArithAbort: true  // Required for compatibility
    },
    pool: {
        max: 10,  // Maximum number of connections in the pool
        min: 0,   // Minimum number of connections in the pool (can scale down to 0 when idle)
        idleTimeoutMillis: 30000  // Close idle connections after 30 seconds
    }
}

export default dbConfig;
