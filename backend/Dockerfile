ARG NODE_VERSION=24.11.1
FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

#  Installazione Dipendenze di Sistema (Python & Semgrep) ---
RUN apk add --no-cache python3 py3-pip build-base python3-dev libffi-dev

# virtual environment per python
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install semgrep

COPY package*.json .

RUN npm install

RUN --mount=type=cache,target=/root/.npm\
    npm install -g @nestjs/cli

COPY . .

EXPOSE 3000

RUN semgrep --version

CMD ["npm", "run", "start:dev"]
