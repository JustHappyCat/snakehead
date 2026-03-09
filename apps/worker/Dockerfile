FROM node:20-alpine AS base

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV production

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

COPY prisma ./prisma
COPY package*.json ./

RUN npm ci --omit=dev --prefer-offline --no-audit
RUN npx prisma generate

COPY . .
RUN npm run build || npx tsc

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node /app/healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
