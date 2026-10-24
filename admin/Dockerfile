# Stage 1: Build production Admin React assets
FROM node:20-slim AS builder

WORKDIR /app

# Pass build arguments for VITE variables
ARG VITE_API_URL=http://localhost:5050
ARG VITE_APP_URL=http://localhost:3000

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve static files using Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
