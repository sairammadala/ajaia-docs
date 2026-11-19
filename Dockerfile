FROM node:20-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Applies pending migrations (and the demo seed), then starts the server.
CMD ["sh", "scripts/start.sh"]
