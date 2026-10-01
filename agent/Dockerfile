# Linux-only: this container launches a *visible* Chrome/Chromium window that
# must show up on the room PC's real display (see BROWSER_HEADLESS=false).
# It needs the host's X11 socket passed in at `docker run`/compose time -
# there is no equivalent on Windows, so Windows rooms should keep running the
# agent natively via install.ps1 instead of this image.
#
# This tag MUST match the exact "playwright" version resolved in
# package-lock.json (not just the package.json range) - the base image's
# bundled Chromium build is tied 1:1 to this version, and a mismatch fails
# with "browserType.launch: Executable doesn't exist". Check with:
#   grep -A2 '"node_modules/playwright"' agent/package-lock.json
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
