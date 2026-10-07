FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001 ORBIT_DATA_DIR=/data/orbit
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p /data/orbit && chown -R node:node /data /app
COPY --from=build /app/dist ./dist
COPY server ./server
USER node
VOLUME ["/data"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
