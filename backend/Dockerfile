# 1. Build
FROM node:20-alpine as base
WORKDIR /app

# 2. Dependencies
FROM base AS dependencies
COPY package*.json ./
RUN npm i

# 3. Build
FROM dependencies AS build
COPY . .
RUN npm run build

# 4. Prod
FROM base AS prod
ENV NODE_ENV=production

COPY --from=dependencies /app/package*.json ./
RUN npm ci --only=production

COPY --from=build /app/dist ./dist

EXPOSE 3001
    
CMD ["node", "dist/index.js"]


