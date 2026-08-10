FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace configuration
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build both client and server workspaces
ARG VITE_AADS_UNIT_ID
ENV VITE_AADS_UNIT_ID=$VITE_AADS_UNIT_ID
RUN npm run build

# --- Production Image ---
FROM node:20-alpine

WORKDIR /app

# Copy root package.json for workspace definition
COPY package.json ./

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/package.json ./packages/client/
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Expose port
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0

CMD ["npm", "run", "start"]
