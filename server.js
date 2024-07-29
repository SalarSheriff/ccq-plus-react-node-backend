import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';


//Must be imported to connect to the database. Pool is created in there
import './db.js'
import { getPersons, createLog, getLastLogForEachCompany, getLogs } from './db.js';






const app = express();
const port = 4000;


// Configure CORS options
const corsOptions = {
  origin: 'http://localhost:3000', // Allowed origins to call API
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));




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



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
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