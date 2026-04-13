# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspace=client
COPY client/ client/
RUN npm run build --workspace=client

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --workspace=server --omit=dev

COPY server/ server/
COPY --from=client-build /app/client/dist client/dist

USER appuser
EXPOSE 3001

CMD ["node", "server/src/index.js"]
