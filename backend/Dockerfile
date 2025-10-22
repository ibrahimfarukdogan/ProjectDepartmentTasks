# Use an official Node.js image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the wait-for-it script
COPY wait-for-it.sh ./wait-for-it.sh
RUN chmod +x ./wait-for-it.sh

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "run", "dev"]