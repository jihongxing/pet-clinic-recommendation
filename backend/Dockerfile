FROM node:20-bookworm-slim AS base

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev

# Improve file watching reliability for bind mounts on Windows/macOS.
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY test ./test
COPY .env.example ./.env.example

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM deps AS builder

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY .env.example ./.env.example

RUN npm run build

FROM base AS production

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/src/database ./src/database
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
