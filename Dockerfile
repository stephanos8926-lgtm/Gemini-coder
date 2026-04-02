# Use Node 22 slim for a lightweight image
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the frontend
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-slim

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the built frontend and server from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env

# Expose the port GIDE runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/server.cjs"]
