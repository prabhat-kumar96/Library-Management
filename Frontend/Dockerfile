# Frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Vite needs --host to allow external network access inside a container
CMD ["npm", "run", "dev", "--", "--host"]