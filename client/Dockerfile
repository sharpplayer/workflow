# Base image with Node.js
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose dev server port
EXPOSE 4200

# Run Angular dev server with host 0.0.0.0
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll=2000", "--disable-host-check"]