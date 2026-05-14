FROM node:20-alpine

RUN corepack enable && apk add --no-cache git

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-maxtimeout 120000 \
 && pnpm config set network-timeout 300000 \
 && pnpm install --no-frozen-lockfile \
 && mkdir -p node_modules/react-native-css-interop/.cache \
 && : > node_modules/react-native-css-interop/.cache/web.css

COPY . .

EXPOSE 3000 8081
