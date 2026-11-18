# One image: the Angular browser bundle is served by Nest from server-nest/public
# (ADR 0001, SSR is postponed). Build: docker build --build-arg APP_VERSION=1.0.0 .
FROM node:22-bookworm-slim AS build
ENV HUSKY=0 CI=true
RUN corepack enable
WORKDIR /repo

# Manifests first: the dependency layer is rebuilt only when a lockfile changes
COPY package.json pnpm-workspace.yaml .npmrc pnpm-lock.yaml ./
COPY client/package.json client/pnpm-lock.yaml client/.npmrc client/
COPY server-nest/package.json server-nest/pnpm-lock.yaml server-nest/
COPY packages/schemas/package.json packages/schemas/pnpm-lock.yaml packages/schemas/
COPY packages/domain/package.json packages/domain/pnpm-lock.yaml packages/domain/
RUN pnpm install --frozen-lockfile

COPY . .
ARG SITE_URL=http://localhost
# Empty API_URL: the client calls the same origin (/rest)
RUN APP_ENV=production SITE_URL=$SITE_URL pnpm --dir client build:prod \
 && pnpm --dir server-nest build

# Runtime dependencies only, same workspace layout so workspace:* links resolve
FROM node:22-bookworm-slim AS deps
ENV HUSKY=0 CI=true
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY server-nest/package.json server-nest/pnpm-lock.yaml server-nest/
COPY packages/schemas/package.json packages/schemas/pnpm-lock.yaml packages/schemas/
COPY packages/domain/package.json packages/domain/pnpm-lock.yaml packages/domain/
COPY --from=build /repo/packages/schemas/dist packages/schemas/dist
COPY --from=build /repo/packages/domain/dist packages/domain/dist
RUN pnpm install --frozen-lockfile --prod --filter "./server-nest..." --filter "./packages/*"

FROM node:22-bookworm-slim
ARG APP_VERSION=unknown
ENV NODE_ENV=production \
    PORT=3001 \
    MEDIA_DIR=/data/media \
    APP_VERSION=$APP_VERSION \
    NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app/server-nest
COPY --from=deps /app /app
COPY --from=build /repo/server-nest/dist ./dist
COPY --from=build /repo/server-nest/public ./public
COPY --from=build /repo/client/dist/browser ./public
RUN mkdir -p /data/media logs && chown -R node:node /data /app/server-nest/logs
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/rest/version').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main"]
