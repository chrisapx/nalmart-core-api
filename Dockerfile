FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist
COPY config ./config
COPY .env.example ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/app.js"]