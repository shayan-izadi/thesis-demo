# One Dockerfile for every environment.
# Nothing environment-specific is baked in except the version label;
# APP_ENV, DATABASE_URL, GREETING etc. are injected by Dokploy at runtime.

FROM node:22-alpine

ARG APP_VERSION=dev
ENV NODE_ENV=production \
    APP_VERSION=${APP_VERSION} \
    PORT=3000

WORKDIR /app
COPY app/package.json ./
COPY app/server.js ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
