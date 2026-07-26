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
WORKDIR /workspace

RUN npm install --global pnpm@11.17.0
COPY --from=build /workspace /workspace

EXPOSE 8080
CMD ["bash", "-lc", "pnpm --filter @manto-sagrado/admin exec next start --hostname 0.0.0.0 --port ${PORT:-8080}"]
