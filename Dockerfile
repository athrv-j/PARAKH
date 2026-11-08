FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace manifests
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/

# Install dependencies cleanly
RUN npm ci

# Copy entire repository source code
COPY . .

# Build both backend (TypeScript) and frontend (Vite)
RUN npm run build

# Seed initial database
RUN npm run seed:sample

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy manifests, dependencies and compiled output
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/parakh.db* ./
COPY --from=builder /app/sample-data ./sample-data

EXPOSE 4000

CMD ["npm", "start"]
