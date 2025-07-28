# Use official Node.js LTS version as base image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the project files
COPY . .

# Create downloads folder (optional)
RUN mkdir -p downloads

# Expose port 3000
EXPOSE 3000

# Start the bot and API server
CMD ["node", "index.js"]
