const express = require('express');
const cors = require('cors');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');

// Must be imported to connect to the database. Pool is created in there
require('./db.js');

const {
  getPersons,
  createLog,
  getLastLogForEachCompany,
  getLogs,
  getLogsInRange,
  validateAdmin,
  insertImage,
  getImages,
  getImageInspectionComments,
  insertImageInspectionComments
} = require('./db.js');

const multer = require('multer');
const path = require('path');




//Load the timezone dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/New_York'); // set default timezone to New York(EST)

//dayjs().tz() to get date in time zone

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Save images temporarily
  },
  filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });





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




//Bad for billing? Aug 23rd billing rampage
// setInterval(() => {
//   console.log('Keeping the server awake');
// }, 5000); // keep server awake

app.get('/', async (req, res) => {



  const currentTime = dayjs().tz().format("YYYYMMDD HHmm");

  res.send(`
    <html>
      <body>
        
      <h1>CCQ Plus has been fixed</h1>
        <p><a href="https://ccqplus.com">Click here to reload the site CCQPlus</a></p>
      </body>
    </html>
  `);
});


app.post('/api/uploadimages', upload.array('images'), async (req, res) => {
  const comment = req.body.comment;
  const images = req.files;
const company = req.body.company;

  try {
      for (const image of images) {
          const imageName = image.originalname;
          const imagePath = image.path;
          

          // Insert image into the database
          await insertImage(imageName, imagePath, company);

          // Optionally, delete the file after insertion to clean up
          fs.unlinkSync(imagePath);
      }

      res.json({ message: 'Images and comment uploaded successfully!' });
  } catch (error) {
      console.error('Error handling image upload:', error);
      res.status(500).json({ message: 'Error uploading images' });
  }
});
app.get('/api/images/:company/:date', async (req, res) => {




  
  const company = req.params.company
const date = req.params.date

let images = await getImages(company, date)
 res.json(images);
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
//Check if user is authorized
let authorizedUser = await isAuthorizedUser(req.headers.authorization);
if(!authorizedUser){ 
  console.error('Error fetching logs:');
  return res.status(401).send('Unable to fetch logs. Unauthorized user');
  
}

  try {
    const lastLog = await getLastLogForEachCompany();
    res.json(lastLog);
  } catch (error) {
    console.error('Error fetching last log:', error);
    res.status(500).send('Failed to fetch last log');
  }
});



app.post('/api/uploadLog', async (req, res)=> {
//Check if user is authorized
let authorizedUser = await isAuthorizedUser(req.headers.authorization);
if(!authorizedUser){ 
  console.error('Error fetching logs:');
  return res.status(401).send('Unable to fetch logs. Unauthorized user');
  
}

  try {
    const { company, message, name, action } = req.body;
    const log = await createLog(dayjs().tz().format('YYYYMMDD'),dayjs().tz().format('HHmm'), name, message, action, company, "no_time_out"); //method in db.js
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }

  //console.log(req.body)
})

app.post('/api/uploadPresencePatrol', async (req, res) => { 

  //Check if user is authorized
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if(!authorizedUser){ 
    console.error('Error fetching logs:');
    return res.status(401).send('Unable to fetch logs. Unauthorized user');
    
  }


  try {
    const { company, message, name, action, patrolTime} = req.body;

    //Get the time the patrol was started by subtracting the current time from the patrol time(seconds)
    const patrolTimeInMinutes = patrolTime / 60.0
    // Subtract patrol time from current time
    const resultTime = dayjs().tz().subtract(patrolTimeInMinutes, 'minute');
    // Format the result time in 'HHmm'
    const startTime = resultTime.format('HHmm');



    const log = await createLog(dayjs().tz().format('YYYYMMDD'),startTime, name, message, action, company, dayjs().tz().format('HHmm')); //method in db.js
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }



});

app.get('/api/getLogs/:company', async (req, res) => {

//Check if user is authorized
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if(!authorizedUser){ 
    console.error('Error fetching logs:');
    return res.status(401).send('Unable to fetch logs. Unauthorized user');
  
  }


  //Get the logs
  try {
    const logs = await getLogs(req.params.company);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Failed to fetch logs');
  }

})

app.get('/api/getLogsInRange/:company/:date1/:date2', async (req, res) => {
  //Check if user is authorized
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if(!authorizedUser){ 
    console.error('Error fetching logs:');
    return res.status(401).send('Unable to fetch logs. Unauthorized user');
    
  }


    try {
      const logs = await getLogsInRange(req.params.company, req.params.date1, req.params.date2);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).send('Failed to fetch logs');
    }
});



app.post('/api/uploadImageInspectionComments', async (req, res) => { 

//Time is managed server side
  try {
    const { cadet_name, company,comment } = req.body;
    const log = await insertImageInspectionComments(cadet_name, company, comment);
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }

  
});
app.get('/api/getImageInspectionComments/:company/:date', async (req, res) => {

  console.log(req.params.company, req.params.date);

  try {
    const comments = await getImageInspectionComments(req.params.company, req.params.date);
    console.log(comments);
    res.json(comments);
    
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).send('Failed to fetch comments');
  }
 });

app.get('/test', async (req, res) => {
  res.send('TEST');
})

app.get('/api/validateAdmin', async (req, res) => {
  try {
    const accessToken = req.headers.authorization
    const profileData = await fetchProfileData(accessToken);
    console.log(profileData);

    let isAdmin = await validateAdmin(profileData.mail);
    res.json(isAdmin);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Failed to fetch profile data');
  }
});

//Hosting server on un secure http
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// // Hosting server on https
// https.createServer(options, app).listen(port, () => {
//   console.log('Secure server running on https://localhost:' + port);
// });

//SERVER FUNCTIONS



/* Uses microsoft graph to get data using a user's access token
This returns name, email etc
Example data
{
  '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
  businessPhones: [ '+1 609.917.0672' ],
  displayName: 'Sheriff, Salar H CDT 2027',
  givenName: 'Salar',
  jobTitle: 'Cadet',
  mail: 'salar.sheriff@westpoint.edu',
  mobilePhone: null,
  officeLocation: 'I1',
  preferredLanguage: null,
  surname: 'Sheriff',
  userPrincipalName: 'salar.sheriff@westpoint.edu',
  id: '3430d3f6-79dd-4b00-b013-22c2b55d5afb'
}
*/
const fetchProfileData = async (accessToken) => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // Check if the response status indicates an error (e.g., unauthorized or other errors)
  if (!response.ok) {
    const error = new Error('Failed to fetch profile data');
    error.status = response.status;
    throw error;
  }

  return response.json();
};

//Checks if the user is authorized to use the app
async function isAuthorizedUser(token) {
  try {
    const profileData = await fetchProfileData(token);

    // Check if the 'mail' property exists and contains the correct domain
    if (profileData.mail && profileData.mail.includes("@westpoint.edu")) {

      console.log('Authorized user: ' + profileData.mail + " passed authorization check");
      return true;
    } else {
      // Explicitly handle the case where the email domain is not as expected
      return false;
    }

  } catch (error) {
    // Log the error for debugging (can be expanded to use a proper logging mechanism)
    console.error('Authorization error:', error);

    // Handle specific errors based on the status code if necessary
    if (error.status === 401) {
      // Token is invalid or expired
      return false;
    } else {
      // Handle other errors (network issues, etc.)
      return false;
    }
  }
}