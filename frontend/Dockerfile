ARG NODE_VERSION=24.11.1
ARG PNPM_VERSION=10.28.1

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_VERSION=${PNPM_VERSION};

RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@latest-10

COPY package*.json .

RUN pnpm install

EXPOSE 5173

CMD ["pnpm", "run", "dev"]
