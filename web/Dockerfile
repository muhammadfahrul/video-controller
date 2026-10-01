# VITE_* vars are baked into the JS bundle at build time (see web/.env),
# same as the native install.ps1/install.sh flow - changing SERVER_IP means
# rebuilding this image, not just restarting the container.
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 53333

CMD ["npm", "run", "preview:host"]
