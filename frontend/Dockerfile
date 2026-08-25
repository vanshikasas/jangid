FROM node:22-bookworm AS builder

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/dist/skja-frontend/browser/ /usr/share/nginx/html/
COPY public/runtime-config.js /usr/share/nginx/html/runtime-config.js

EXPOSE 80
