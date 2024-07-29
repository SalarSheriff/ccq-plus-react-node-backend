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
  
async function getLogs() {
  try {
    const result = await pool.request().query('SELECT * FROM Log');
    return result.recordset;
  } catch(error) {
    console.log(error)
  }

}
/*
To get the last log entry for each company in SQL, you can use the ROW_NUMBER() window function to assign a unique row number to each log entry within each company, ordered by the id or date and time (depending on how you define the "last" log). Then, you can select only the rows with the row number equal to 1.

Each company gets its entries ordered in rows by id, largest id to smallest. Meaning the latest message is first
since it has the largest id
pick rn=1 (row number 1) for each company
*/
async function getLastLogForEachCompany() {
  
  if (pool) {
    const query = `
      WITH RankedLogs AS (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY company ORDER BY id DESC) AS rn
          FROM Log
      )
      SELECT *
      FROM RankedLogs
      WHERE rn = 1;
    `;

    try {
      const result = await pool.request().query(query);
   
      return result.recordset;
    } catch (err) {
      console.error('Failed to get the last log for each company:', err);
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



export { getPersons, createLog, getLastLogForEachCompany, getLogs };