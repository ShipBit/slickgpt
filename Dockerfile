# this specifically jsut runs the preview and 
# it doesnt really expose port 3000 or 4173 here
# Use the official Node.js 16 image as a parent image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (or yarn.lock) files
COPY package*.json ./

# Install any dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Build the application for production
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "run", "preview","--host"]

