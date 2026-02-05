# LOTOTET Production Deployment

Hướng dẫn deploy LOTOTET lên production với Nginx Load Balancer.

## Kiến trúc

```
                    Internet
                        │
               ┌────────┴────────┐
               │      Nginx      │ :80
               │ (Load Balancer) │
               └────────┬────────┘
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   ▼
┌─────────┐       ┌─────────┐         ┌─────────┐
│  API 1  │       │  API 2  │         │  Admin  │
└────┬────┘       └────┬────┘         └────┬────┘
     └─────────────────┼───────────────────┘
                       ▼
               ┌─────────────┐
               │    Redis    │
               └─────────────┘
```

## Yêu cầu

- Docker & Docker Compose
- Node.js 20+ (để build frontend)

## Bước triển khai

### 1. Clone và chuẩn bị

```bash
git clone https://github.com/tuanpham2xx3/LOTOTET.git
cd LOTOTET
```

### 2. Build Frontend

```bash
# Install dependencies
pnpm install

# Build Web frontend
pnpm --filter @lototet/web build
cp -r apps/web/dist deploy/web-dist

# Build Admin Web frontend
pnpm --filter @lototet/admin-web build
cp -r apps/admin-web/dist deploy/admin-dist
```

### 3. Cấu hình môi trường

```bash
cd deploy
cp .env.example .env
# Sửa .env với các giá trị thực
```

### 4. Chạy Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Kiểm tra

```bash
# Xem logs
docker-compose -f docker-compose.prod.yml logs -f

# Kiểm tra health
curl http://localhost/health
curl http://localhost/nginx-health
```

## Scale API

Để thêm API instances, sửa `nginx.conf` và `docker-compose.prod.yml`:

```bash
# Thêm api-3 vào nginx upstream và docker-compose
# Sau đó:
docker-compose -f docker-compose.prod.yml up -d --build
```

## Endpoints

| URL | Mô tả |
|-----|-------|
| `http://your-domain/` | Game Web |
| `http://your-domain/admin/` | Admin Dashboard |
| `http://your-domain/health` | API Health Check |
| `http://your-domain/nginx-health` | Nginx Health Check |

## Troubleshooting

### WebSocket không kết nối được

Kiểm tra Nginx logs:
```bash
docker logs lototet-nginx
```

### Redis connection failed

Kiểm tra Redis:
```bash
docker exec lototet-redis redis-cli -a $REDIS_PASSWORD ping
```
