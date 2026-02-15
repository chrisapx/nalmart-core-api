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

# Copy only production files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY .env.example ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/app.js"]