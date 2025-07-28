# CDN Services - Image processing özellikli Dockerfile
FROM node:18-alpine

# Sharp için gerekli dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# Çalışma dizini
WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./

# Dependencies'leri yükle (sharp native build yapacak)
RUN npm install --production

# Uygulama kodunu kopyala
COPY . .

# Upload ve cache dizinlerini oluştur
RUN mkdir -p uploads cache && \
    chmod 755 uploads cache

# Port
EXPOSE 3012

# Uygulama başlat
CMD ["node", "src/index.js"]