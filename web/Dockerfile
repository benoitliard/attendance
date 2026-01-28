FROM node:20-alpine

WORKDIR /app

# Build argument for API URL (needed at build time for Next.js)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

EXPOSE 3000

# Start in production mode
CMD ["npm", "start"]
