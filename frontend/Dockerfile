# Use official Node.js image to build the frontend
FROM node:20 AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Use official Nginx image to serve the built frontend
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config (used as a template) and install envsubst for runtime variable substitution
COPY frontend/default.conf /etc/nginx/templates/default.conf.template
RUN apk add --no-cache gettext

# Expose the templated port (runtime will set FRONTEND_PORT)
EXPOSE 9060

# At container start substitute env vars into the template and start nginx
CMD ["/bin/sh", "-c", "envsubst '$API_URL $FRONTEND_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
