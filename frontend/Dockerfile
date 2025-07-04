FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
RUN npm run build


FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# run nginx in foreground
CMD ["nginx", "-g", "daemon off;"] 