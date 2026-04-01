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

# Install tsx globally or locally to run the server
RUN npm install -g tsx

# Copy the built frontend from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server code
COPY server.ts ./
COPY .env.example ./.env

# Expose the port GIDE runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["tsx", "server.ts"]
