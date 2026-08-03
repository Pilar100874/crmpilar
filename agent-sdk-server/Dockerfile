FROM node:20-slim

WORKDIR /app

# Dependências úteis para Playwright / Remotion
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation ffmpeg jq curl python3 bash git \
  && rm -rf /var/lib/apt/lists/*

# Navegadores do Playwright ficam numa pasta fixa (fora do HOME) para o
# container conseguir achá-los mesmo rodando com outro usuário.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json ./
RUN npm install --omit=dev

# Instala o Chromium + libs de sistema (headless) usado pelas rotinas Playwright.
RUN npx --yes playwright install --with-deps chromium

COPY . .

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
