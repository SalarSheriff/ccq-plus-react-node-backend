import sql from 'mssql';
import config from './dbconfig.js';


//A pool connects to the database. It can handle multiple connections for all users
let pool;
//Connect to the database and set pool
connectToDatabase();






//Use the dbconfig.js file to connect to the database
async function connectToDatabase() {
    try {
        pool = await sql.connect(config);
        console.log('Connected to the SQL database');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

async function createLog(date, time, name, message, action, company) {
    
  
    if (pool) {
      const query = `
        INSERT INTO Log (date, time, name, message, action, company)
        VALUES (@date, @time, @name, @message, @action, @company);
      `;
  
      try {
        await pool.request()
          .input('date', sql.NVarChar, date)
          .input('time', sql.NVarChar, time)
          .input('name', sql.NVarChar, name)
          .input('message', sql.NVarChar, message)
          .input('action', sql.NVarChar, action)
          .input('company', sql.NVarChar, company)
          .query(query);
        console.log('Log entry inserted');
      } catch (err) {
        console.error('Failed to insert log entry:', err);
      }
    }
  }
  



//Sample to get all "People" object from the table
async function getPersons() {
    try {
        const result = await pool.request().query('SELECT * FROM Person');
        return result.recordset;
    } catch (err) {
        console.error('SQL error:', err);
    }
}



export { getPersons, createLog };