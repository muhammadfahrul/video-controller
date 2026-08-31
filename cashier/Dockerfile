# VITE_* vars are baked into the JS bundle at build time (see cashier/.env),
# same as the native install.ps1/install.sh flow - changing VITE_ROOMS means
# rebuilding this image, not just restarting the container.
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 53335

CMD ["npm", "run", "preview:host"]
