# Sophia Stack — run it like a container, no VPS required.
#   docker build -t sophia-stack .
#   docker run -p 3000:3000 -v sophia-data:/app/.sophia-data sophia-stack
# Then open http://localhost:3000 and follow the onboarding wizard.

# 1) Build the zero-install artifact from source.
FROM node:20-alpine AS build
WORKDIR /src
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN node scripts/build.mjs && node scripts/package.mjs

# 2) Tiny runtime image — just the bundled artifact (no node_modules, no install).
FROM node:20-alpine
WORKDIR /app
# `tar` lets the one-click git installer pull extensions; everything else is built in.
RUN apk add --no-cache tar
COPY --from=build /src/package/ ./
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
# Persist your site, data, accounts, media, and installed extensions across restarts.
VOLUME ["/app/.sophia-data"]
CMD ["node", "app.js"]
