import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import https from 'https'
import fs from 'fs'
//Must be imported to connect to the database. Pool is created in there
import './db.js'
import { getPersons, createLog, getLastLogForEachCompany, getLogs, getLogsInRange } from './db.js';






const app = express();

const port = process.env.PORT || 4000;


const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS.split(',');

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
// Load your SSL certificate and key
const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
};


app.get('/', async (req, res) => {
  res.send('Hello, World!');

  //createLog('20210901', '1200', 'John Doe', 'This is a message', 'Login', 'Company A');

  //console.log(await getLastLogForEachCompany());
});




//Test method to see if a token can get an api response from graph
app.get('/api/protected', async (req, res) => {
  try {
    const accessToken = req.headers.authorization
    const profileData = await fetchProfileData(accessToken);
    console.log(profileData);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Failed to fetch profile data');
  }
});


app.get('/api/getLastLogForEachCompany', async (req, res) => { 

  try {
    const lastLog = await getLastLogForEachCompany();
    res.json(lastLog);
  } catch (error) {
    console.error('Error fetching last log:', error);
    res.status(500).send('Failed to fetch last log');
  }
});



app.post('/api/uploadLog', async (req, res)=> {


  try {
    const { company, message, name, action } = req.body;
    const log = await createLog(dayjs().format('YYYYMMDD'),dayjs().format('HHmm'), name, message, action, company, "no_time_out"); //method in db.js
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }

  //console.log(req.body)
})

app.post('/api/uploadPresencePatrol', async (req, res) => { 

  try {
    const { company, message, name, action, patrolTime} = req.body;

    //Get the time the patrol was started by subtracting the current time from the patrol time(seconds)
    const patrolTimeInMinutes = patrolTime / 60.0
    // Subtract patrol time from current time
    const resultTime = dayjs().subtract(patrolTimeInMinutes, 'minute');
    // Format the result time in 'HHmm'
    const startTime = resultTime.format('HHmm');



    const log = await createLog(dayjs().format('YYYYMMDD'),startTime, name, message, action, company, dayjs().format('HHmm')); //method in db.js
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }



});

app.get('/api/getLogs/:company', async (req, res) => {

  try {
    const logs = await getLogs(req.params.company);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Failed to fetch logs');
  }

})

app.get('/api/getLogsInRange/:company/:date1/:date2', async (req, res) => {
  
    try {
      const logs = await getLogsInRange(req.params.company, req.params.date1, req.params.date2);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).send('Failed to fetch logs');
    }
});



//Hosting server on un secure http
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

// Hosting server on https
https.createServer(options, app).listen(port, () => {
  console.log('Secure server running on https://localhost:' + port);
});

//SERVER FUNCTIONS



/* Uses microsoft graph to get data using a user's access token
This returns name, email etc
*/
const fetchProfileData = async (accessToken) => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
};