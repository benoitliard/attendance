FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma (Debian-based)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema and migrations
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3001

# Start command
# Run migrations, seed (if first run), and start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed || true && npm start"]
