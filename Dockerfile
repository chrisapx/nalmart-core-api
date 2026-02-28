FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dev deps
COPY package*.json ./
RUN npm ci

# Copy all source code
COPY . .

# Build the project
RUN npm run build

# --------------------------
# Production image
# --------------------------
FROM node:20-alpine

WORKDIR /app

# netcat for DB readiness check in entrypoint
RUN apk add --no-cache netcat-openbsd

# Install production deps, then add sequelize-cli for running migrations
COPY package*.json ./
RUN npm ci --omit=dev && npm install sequelize-cli --no-save

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy migration assets (Sequelize CLI needs these at runtime)
COPY .sequelizerc ./
COPY src/migrations ./src/migrations
COPY src/config/sequelize.config.js ./src/config/sequelize.config.js

# Entrypoint: wait for DB → migrate → start
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]