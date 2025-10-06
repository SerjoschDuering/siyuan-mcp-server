# SiYuan MCP Server - HTTP Transport (Production)
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Expose HTTP port
EXPOSE 3000

# Run HTTP server (Streamable HTTP transport)
CMD ["node", "dist/server.js"]
