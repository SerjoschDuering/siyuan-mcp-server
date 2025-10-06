# SiYuan MCP Server - HTTP Transport (Production)
FROM node:lts-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:lts-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose HTTP port
EXPOSE 3000

# Run HTTP server (Streamable HTTP transport)
CMD ["node", "dist/server.js"]
