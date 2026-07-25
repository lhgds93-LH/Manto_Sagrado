FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN npm install --global pnpm@11.17.0

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @manto-sagrado/api prisma:generate
RUN pnpm --filter @manto-sagrado/api build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /workspace

RUN npm install --global pnpm@11.17.0

COPY --from=build /workspace /workspace

EXPOSE 8080

CMD ["pnpm", "--filter", "@manto-sagrado/api", "start:prod"]
