FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --no-audit
COPY server/tsconfig.json ./server/
COPY server/src ./server/src
COPY server/data ./server/data
COPY server/views ./server/views
RUN cd server && npm run build
RUN cd server && npm prune --production
COPY --from=frontend-builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
