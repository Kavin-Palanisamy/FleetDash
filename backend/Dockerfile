FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package definitions
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy backend source
COPY . .

# Set ownership to unprivileged user and switch
RUN chown -R node:node /app
USER node

EXPOSE 5000

CMD ["node", "server.js"]
