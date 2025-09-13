# Use official Node.js image to build the frontend
FROM node:20 AS build
WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY ./ ./
RUN npm run build

# Use official Nginx image to serve the built frontend
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 9060
CMD ["nginx", "-g", "daemon off;"]
