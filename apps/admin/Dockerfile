FROM node:24-bookworm-slim AS build

WORKDIR /workspace
RUN npm install --global pnpm@11.17.0
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @manto-sagrado/admin build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /workspace/apps/admin/.next/standalone ./
COPY --from=build /workspace/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 8080
CMD ["node", "apps/admin/server.js"]
