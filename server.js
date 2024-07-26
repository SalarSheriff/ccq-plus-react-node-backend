import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = 4000;

// Configure CORS options
const corsOptions = {
  origin: 'http://localhost:3000', // Allowed origins to call API
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Enable CORS for all routes
app.use(cors(corsOptions));

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


app.get('/', (req, res) => {
  res.send('Hello, World!');
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





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
