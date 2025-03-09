# Use Node.js LTS version
FROM node:20-slim

# Install ffmpeg which is required for audio conversion
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install nodemon

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD [ "node", "app.js" ] 