# Stage 1: Build production React assets
FROM node:20-slim AS builder

WORKDIR /app

# Pass build arguments if needing customized VITE variables
ARG VITE_API_URL=http://localhost:5050/api
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_META_PIXEL_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_META_PIXEL_ID=$VITE_META_PIXEL_ID

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
