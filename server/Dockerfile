FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY nest-cli.json tsconfig.json ./
COPY src ./src

RUN npm install -g @nestjs/cli && nest build

EXPOSE 3000

CMD ["node", "dist/main"]
