FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration staging
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/tp-ecsr-pilot/browser/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=4 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
