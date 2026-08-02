FROM node:20-slim

WORKDIR /app

# Dependências úteis para Playwright / Remotion (opcional, comente se não usar)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation ffmpeg jq curl python3 bash git \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
