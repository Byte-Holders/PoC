ARG NODE_VERSION=24.11.1

FROM node:${NODE_VERSION}-alpine
WORKDIR /usr/src/app

COPY package*.json .
RUN npm install

RUN --mount=type=cache,target=/root/.npm\
    npm install -g @nestjs/cli

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
