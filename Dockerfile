# Use an official Node.js runtime as a parent image
FROM node:20

# Set the working directory in the container
#So a way to think about it would be FROM node:20 installs a linux os with node. Then WORKDIR goes to /usr/src/app of that linux directory and sets up all the stuff
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 4000

# Define the command to run the app
CMD ["node", "server.js"]
