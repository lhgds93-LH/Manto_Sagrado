FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN npm install --global pnpm@11.17.0

COPY . .

# O Prisma 7 valida a presença da variável durante a geração, mas não conecta ao banco.
# Este valor existe somente na etapa de build e não é levado ao runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

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
