FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy both package.json and package-lock.json (if exists)
COPY package*.json ./

# ✅ Remove `--production`, let it install all (safer for bots)
RUN npm install

# Copy rest of the code
COPY . .

# Create download folder
RUN mkdir -p downloads

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "index.js"]
