# Build stage
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY scripts ./scripts
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev

COPY --from=build /usr/src/app/dist ./dist

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
