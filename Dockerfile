# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# Builder stage
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server/index.js"]
