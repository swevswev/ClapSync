FROM node:18

# Set working directory in container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy src folder into container
COPY src ./src

# Expose the port your app runs on
EXPOSE 5000

# Run your backend
CMD ["node", "src/index.js"]