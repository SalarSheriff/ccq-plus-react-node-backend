import sql from 'mssql';
import config from './dbconfig.js';
import fs from 'fs';
import dayjs from 'dayjs';
//A pool connects to the database. It can handle multiple connections for all users
let pool;


//Connect to the database and set pool
connectToDatabase();






//Use the dbconfig.js file to connect to the database
async function connectToDatabase() {

  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }

  try {
    pool = await sql.connect(config);
    console.log('Connected to the SQL database');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

async function createLog(date, time, name, message, action, company, timeOut) {
  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }

  if (pool) {
    const query = `
        INSERT INTO Log (date, time, name, message, action, company, timeOut)
        VALUES (@date, @time, @name, @message, @action, @company, @timeOut);
      `;

    try {
      await pool.request()
        .input('date', sql.NVarChar, date)
        .input('time', sql.NVarChar, time)
        .input('name', sql.NVarChar, name)
        .input('message', sql.NVarChar, message)
        .input('action', sql.NVarChar, action)
        .input('company', sql.NVarChar, company)
        .input('timeOut', sql.NVarChar, timeOut)
        .query(query);
      console.log('Log entry inserted');
    } catch (err) {
      console.error('Failed to insert log entry:', err);
    }
  }
}

async function getLogs(company) {

  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }
  try {


    const result = await pool.request()
      .input('company', sql.VarChar, company) // Add the company parameter
      .query('SELECT * FROM Log WHERE company = @company'); // Parameterized query

    return result.recordset;
  } catch (error) {
    console.log(error);
  }
}
async function getLogsInRange(company, date1, date2) {
  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }
  try {
    const result = await pool.request()
      .input('company', sql.VarChar, company) // Add the company parameter
      .input('date1', sql.VarChar, date1) // Add the date1 parameter
      .input('date2', sql.VarChar, date2) // Add the date2 parameter
      .query('SELECT * FROM Log WHERE company = @company AND date >= @date1 AND date <= @date2'); // Parameterized query with date range

    return result.recordset;
  } catch (error) {
    console.log(error);
  }
}
async function getAllLogs() {
  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }
  try {
    const result = await pool.request().query('SELECT * FROM Log');
    return result.recordset;
  } catch (error) {
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
  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }
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
  //If the pool is not connected, connect to the database
  if (!pool || !pool.connected) {

    pool = await sql.connect(config);
  }
  try {
    const result = await pool.request().query('SELECT * FROM Person');
    return result.recordset;
  } catch (err) {
    console.error('SQL error:', err);
  }
}




  async function validateAdmin(email) {
    // If the pool is not connected, connect to the database
    if (!pool || !pool.connected) {
      pool = await sql.connect(config);
    }

    try {
      const result = await pool.request()
        .input('Email', sql.NVarChar, email)
        .query('SELECT COUNT(*) as count FROM AuthorizedAdmins WHERE email = @Email');

      return result.recordset[0].count > 0;
    } catch (err) {
      console.error('SQL error:', err);
      throw err;
    }
  }
  async function insertImage(name, imagePath, company) {
    if (!pool || !pool.connected) {
      pool = await sql.connect(config);
    }

    try {
      const imageData = fs.readFileSync(imagePath); // Read the image file as binary data

      // Get the current date and time as strings using dayjs
      const date = dayjs().format('YYYYMMDD');
      const time = dayjs().format('HHmm');

      const result = await pool.request()
        .input('Name', sql.NVarChar, name)
        .input('Company', sql.NVarChar, company)
        .input('ImageData', sql.VarBinary, imageData)
        .input('Date', sql.NVarChar, date)
        .input('Time', sql.NVarChar, time)
        .query('INSERT INTO Images (Name, Company, ImageData, Date, Time) VALUES (@Name, @Company, @ImageData, @Date, @Time)');

      console.log('Image inserted successfully:', result);
    } catch (err) {
      console.error('SQL error:', err);
    }
  }


  async function getImage(id, outputPath) {
    if (!pool || !pool.connected) {
      pool = await sql.connect(config);
    }

    try {
      const result = await pool.request()
        .input('Id', sql.Int, id)
        .query('SELECT ImageData FROM Images WHERE Id = @Id');

      if (result.recordset.length > 0) {
        const imageData = result.recordset[0].ImageData;
        fs.writeFileSync(outputPath, imageData); // Save the binary data to a file
        console.log('Image saved to', outputPath);
      } else {
        console.log('Image not found.');
      }
    } catch (err) {
      console.error('SQL error:', err);
    }
  }



  async function getImages(company, date) {
    if (!company || !date) {
      return res.status(400).json({ message: 'Company and date are required' });
    }

    try {
      if (!pool || !pool.connected) {
        pool = await sql.connect(config);
      }

      const result = await pool.request()
        .input('Company', sql.NVarChar, company)
        .input('Date', sql.NVarChar, date)
        .query('SELECT Name, ImageData FROM Images WHERE Company = @Company AND Date = @Date');

      const images = result.recordset.map(row => ({
        name: row.Name,
        imageData: row.ImageData.toString('base64') // Convert binary data to base64 string
      }));

      return (images);
    } catch (err) {
      console.error('SQL error:', err);

    }
  }
  async function getImageInspectionComments(company, date) {
    // Ensure the pool is connected
    if (!pool || !pool.connected) {
      pool = await sql.connect(config);
    }
  
    try {
      // Query to fetch the comments based on company and date
      const result = await pool.request()
        .input('company', sql.NVarChar(100), company)
        .input('date', sql.NVarChar(10), date)
        .query(`
          SELECT id, date, time, cadet_name, comment, company
          FROM ImageInspectionComment
          WHERE company = @company AND date = @date
        `);
  
      // Return the fetched comments
      return result.recordset;
    } catch (err) {
      console.error('Error fetching Image Inspection Comments:', err);
      throw err; // Re-throw error to handle it at the calling function level
    }
  }
  



  //getImage(1, 'plswork.png');
  export { getPersons, createLog, getLastLogForEachCompany, getLogs, getAllLogs, getLogsInRange, validateAdmin, insertImage, getImage, getImages, getImageInspectionComments };