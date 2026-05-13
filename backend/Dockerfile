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

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const http=require('http'); const port=Number(process.env.PORT||3000); const rawPrefix=process.env.API_PREFIX ?? 'api/v1'; const normalized=String(rawPrefix).replace(/^\\/+|\\/+$/g,''); const path=normalized ? `/${normalized}/health/ready` : '/health/ready'; const req=http.get({host:'127.0.0.1', port, path, timeout:4000}, (res)=>{process.exit(res.statusCode===200?0:1);}); req.on('error', ()=>process.exit(1)); req.on('timeout', ()=>{req.destroy(); process.exit(1);});"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
