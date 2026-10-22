FROM node:22-bookworm-slim

WORKDIR /usr/src/app

# Use the same locked dependency graph as CI.
COPY package.json yarn.lock ./
RUN npm install --global yarn@1.22.22 \
  && yarn install --frozen-lockfile

# Copy application source, then create safe build-time configuration placeholders.
COPY . .
COPY config.example.json ./config.json
COPY ormconfig.ts.example ./ormconfig.ts
COPY src/lib/specialUsers.example.json ./src/lib/specialUsers.json

# Work around an upstream Phoenix bundle issue present in the pinned dependency.
RUN if [ -f node_modules/phoenix/priv/static/phoenix.cjs.js ]; then \
      sed -i '/var global = globalSelf || phxWindow || global;/d' node_modules/phoenix/priv/static/phoenix.cjs.js; \
    fi

RUN yarn rebuild

EXPOSE 3000
CMD ["node", "dist/src/index.js"]
