FROM node:20-slim

WORKDIR /app

# Install curl for healthchecks and debugging
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies (ignoring dev dependencies for smaller image)
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose backend port
EXPOSE 5050

# Set environment defaults
ENV NODE_ENV=production \
    PORT=5050 \
    BIND_HOST=0.0.0.0

CMD ["npm", "start"]
