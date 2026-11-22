# ==============================================================================
# Stage 1: Base & Dependencies
# ==============================================================================
FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ==============================================================================
# Stage 2: Development Server (Hot Reload on Port 5173)
# Usage: docker compose --profile dev up
#    or: docker build --target dev -t modern-charts:dev . && docker run -p 5173:5173 modern-charts:dev
# ==============================================================================
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ==============================================================================
# Stage 3: Builder (Builds Library + Demo Site)
# ==============================================================================
FROM base AS builder
COPY . .
RUN npm run build && npm run build:apps

# ==============================================================================
# Stage 4: Production Static Demo Server (Nginx on Port 8080)
# Usage: docker compose up --build
#    or: docker build -t modern-charts . && docker run -p 8080:80 modern-charts
# ==============================================================================
FROM nginx:alpine AS prod
COPY --from=builder /app/dist-examples /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
