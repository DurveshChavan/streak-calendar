FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx vite build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
ENV PORT=8787 DATA_DIR=/data
VOLUME /data
EXPOSE 8787
CMD ["node", "server/index.mjs"]
