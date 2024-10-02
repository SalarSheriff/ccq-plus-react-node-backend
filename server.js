// Import necessary modules (using ES modules syntax)
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Import your database methods from db.js
import {
  getPersons, createLog, getLastLogForEachCompany, getLogs, getLogsInRange,
  validateAdmin, insertImage, getImages, getImageInspectionComments, insertImageInspectionComments
} from './db.js';

// Configure dotenv to use environment variables
dotenv.config();

// The equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load your SSL certificate and key
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

// Get the local IP address (same as in first script)
const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Setup multer for image uploads (same as second script)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save images temporarily
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Initialize Express app
const app = express();

// CORS setup
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

// Body parser middleware for JSON
app.use(express.json());

// Load the timezone plugins and set default timezone to New York (EST)
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/New_York');

// Serve the static files for the frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Routes for your backend API

// 1. Upload Images
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

// 2. Get Last Log for Each Company
app.get('/api/getLastLogForEachCompany', async (req, res) => {
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if (!authorizedUser) {
    return res.status(401).send('Unauthorized user');
  }

  try {
    const lastLog = await getLastLogForEachCompany();
    res.json(lastLog);
  } catch (error) {
    console.error('Error fetching last log:', error);
    res.status(500).send('Failed to fetch last log');
  }
});

// 3. Upload Log
app.post('/api/uploadLog', async (req, res) => {
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if (!authorizedUser) {
    return res.status(401).send('Unauthorized user');
  }

  try {
    const { company, message, name, action } = req.body;
    const log = await createLog(
      dayjs().tz().format('YYYYMMDD'),
      dayjs().tz().format('HHmm'),
      name,
      message,
      action,
      company,
      "no_time_out"
    );
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }
});

// 4. Upload Presence Patrol Log
app.post('/api/uploadPresencePatrol', async (req, res) => {
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if (!authorizedUser) {
    return res.status(401).send('Unauthorized user');
  }

  try {
    const { company, message, name, action, patrolTime } = req.body;

    // Calculate start time by subtracting patrol time
    const patrolTimeInMinutes = patrolTime / 60.0;
    const resultTime = dayjs().tz().subtract(patrolTimeInMinutes, 'minute');
    const startTime = resultTime.format('HHmm');

    const log = await createLog(
      dayjs().tz().format('YYYYMMDD'),
      startTime,
      name,
      message,
      action,
      company,
      dayjs().tz().format('HHmm')
    );
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }
});

// 5. Get Logs for a Specific Company
app.get('/api/getLogs/:company', async (req, res) => {
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if (!authorizedUser) {
    return res.status(401).send('Unauthorized user');
  }

  try {
    const logs = await getLogs(req.params.company);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Failed to fetch logs');
  }
});

// 6. Get Logs in a Date Range for a Specific Company
app.get('/api/getLogsInRange/:company/:date1/:date2', async (req, res) => {
  let authorizedUser = await isAuthorizedUser(req.headers.authorization);
  if (!authorizedUser) {
    return res.status(401).send('Unauthorized user');
  }

  try {
    const logs = await getLogsInRange(req.params.company, req.params.date1, req.params.date2);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Failed to fetch logs');
  }
});

// 7. Upload Image Inspection Comments
app.post('/api/uploadImageInspectionComments', async (req, res) => {
  try {
    const { cadet_name, company, comment } = req.body;
    const log = await insertImageInspectionComments(cadet_name, company, comment);
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).send('Failed to create log');
  }
});

// 8. Get Image Inspection Comments
app.get('/api/getImageInspectionComments/:company/:date', async (req, res) => {
  try {
    const comments = await getImageInspectionComments(req.params.company, req.params.date);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).send('Failed to fetch comments');
  }
});

// 9. Validate Admin (Microsoft Graph Integration)
app.get('/api/validateAdmin', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;
    const profileData = await fetchProfileData(accessToken);

    let isAdmin = await validateAdmin(profileData.mail);
    res.json(isAdmin);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Failed to fetch profile data');
  }
});

// Fall back to the index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// Start the HTTPS server
const port = process.env.PORT || 3000;
https.createServer(options, app).listen(port, '0.0.0.0', () => {
  const localIP = getLocalIPAddress();
  console.log(`HTTPS Server running on https://${localIP}:${port}`);
});

// Helper functions
const fetchProfileData = async (accessToken) => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    const error = new Error('Failed to fetch profile data');
    error.status = response.status;
    throw error;
  }
  return response.json();
};

async function isAuthorizedUser(token) {
  try {
    const profileData = await fetchProfileData(token);
    if (profileData.mail && profileData.mail.includes("@westpoint.edu")) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}
