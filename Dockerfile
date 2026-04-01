FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Initialize D1 local database
RUN npx wrangler d1 execute soccer-db --local --file=./src/db/schema.sql 2>/dev/null || true

EXPOSE 8080

# Run wrangler dev (local mode)
CMD ["npx", "wrangler", "dev", "--local", "--port", "8080", "--ip", "0.0.0.0"]
