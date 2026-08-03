FROM node:20-slim

WORKDIR /app

# Dependências úteis para Playwright / Remotion / mídia
# - imagemagick: redimensionar, cortar e converter imagens
# - yt-dlp: baixar vídeo/áudio de fontes externas para usar como referência
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation ffmpeg jq curl python3 python3-pip bash git \
    imagemagick \
  && rm -rf /var/lib/apt/lists/* \
  && curl -sSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp

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
