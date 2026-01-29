FROM node:20-alpine

WORKDIR /app

# API_INTERNAL_URL for server-side proxy (Docker network)
ARG API_INTERNAL_URL=http://api:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Next.js app (rewrites are compiled at build time)
RUN npm run build

EXPOSE 3000

# Start in production mode
CMD ["npm", "start"]
