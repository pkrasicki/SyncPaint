FROM node:lts-alpine3.11

LABEL description="A web app for synchronized group drawing"

COPY . /app

WORKDIR /app

RUN npm install && npm run build-prod && npm prune --production

EXPOSE 3000

ENTRYPOINT ["node", "app.js"]
