FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

RUN npm run build

EXPOSE 3001

VOLUME /app/data

CMD ["npx", "tsx", "server/src/index.ts"]
