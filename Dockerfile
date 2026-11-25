# ==============================================================================
# Stage 1: Base & Dependencies
# ==============================================================================
FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

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
FROM nginxinc/nginx-unprivileged:alpine AS prod
USER 101
# Keep the container port used by the existing Docker and Compose commands.
RUN sed -i 's/8080;/80;/g' /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist-examples /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
