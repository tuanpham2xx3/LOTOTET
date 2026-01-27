# 📚 Thư viện và Công cụ sử dụng trong LOTOTET

## 🏗️ Cấu trúc Monorepo

### **pnpm** - Package Manager

- **Chức năng**: Quản lý dependencies cho toàn bộ monorepo
- **Lý do chọn**:
  - Nhanh hơn npm/yarn
  - Tiết kiệm disk space (hard linking)
  - Hỗ trợ workspace tốt
- **Sử dụng trong dự án**:
  - Quản lý 3 packages: `backend`, `frontend`, `packages/shared`
  - Scripts chung: `pnpm dev`, `pnpm build`, `pnpm lint`

### **TypeScript**

- **Phiên bản**: ^5.3.3
- **Chức năng**: Type safety cho toàn bộ codebase
- **Sử dụng trong dự án**:
  - `tsconfig.base.json` - Config chung
  - Path aliases để import shared package dễ dàng
  - Strict mode để đảm bảo code chất lượng

---

## 📦 Shared Package (`packages/shared`)

### **Zod** - Runtime validation

- **Phiên bản**: ^3.22.4
- **Chức năng**: Validate dữ liệu runtime + generate TypeScript types
- **Sử dụng trong dự án**:
  - Validate Socket.IO payloads (join request, mark cell, etc.)
  - Schema cho player data, room state
  - Đảm bảo data từ client hợp lệ trước khi xử lý

### **Jest** + **ts-jest** - Testing framework

- **Chức năng**: Unit testing cho ticket generator
- **Sử dụng trong dự án**:
  - Test harness sinh 10,000 vé và validate
  - Test Zod schemas

---

## 🖥️ Backend (`backend`) - NestJS

### **NestJS Core**

- **Packages**:
  - `@nestjs/common` - Decorators, modules, controllers
  - `@nestjs/core` - Core framework
  - `@nestjs/platform-express` - HTTP server
- **Chức năng**: Framework backend với architecture rõ ràng (modules, controllers, services)
- **Sử dụng trong dự án**:
  - Module system để tổ chức code
  - Dependency injection
  - Decorators cho clean code

### **Socket.IO** - Real-time communication

- **Packages**:
  - `@nestjs/websockets` - NestJS WebSocket support
  - `@nestjs/platform-socket.io` - Socket.IO adapter
  - `socket.io` - Socket.IO server
- **Phiên bản**: ^4.6.1
- **Chức năng**: Real-time bidirectional communication
- **Sử dụng trong dự án**:
  - Room management (create, join, approve)
  - Turn-based gameplay (draw number, mark, no-number)
  - Broadcast room state changes to all players
  - Type-safe với TypeScript interfaces từ shared package

### **RxJS**

- **Phiên bản**: ^7.8.1
- **Chức năng**: Reactive programming (built-in với NestJS)
- **Sử dụng trong dự án**:
  - Handle async operations
  - Event streams

### **Reflect Metadata**

- **Chức năng**: Metadata reflection (required cho NestJS decorators)
- **Sử dụng trong dự án**: Enable decorator functionality

---

## 🎨 Frontend (`frontend`) - Next.js

### **Next.js**

- **Phiên bản**: ^14.1.0
- **Chức năng**: React framework với SSR, routing, optimization
- **Sử dụng trong dự án**:
  - App Router cho routing
  - Server Components (nếu cần)
  - Image optimization
  - Built-in TypeScript support

### **React** + **React DOM**

- **Phiên bản**: ^18.2.0
- **Chức năng**: UI library
- **Sử dụng trong dự án**:
  - Component-based UI
  - Hooks (useState, useEffect, custom hooks)
  - Virtual DOM for performance

### **Socket.IO Client**

- **Package**: `socket.io-client`
- **Phiên bản**: ^4.6.1
- **Chức năng**: Client-side Socket.IO
- **Sử dụng trong dự án**:
  - Connect to backend WebSocket
  - Send/receive real-time events
  - Type-safe với interfaces từ shared package
  - Custom hook `useSocket()` để quản lý connection

### **Zustand** - State management

- **Phiên bản**: ^4.5.0
- **Chức năng**: Lightweight state management (alternative to Redux)
- **Lý do chọn**:
  - Nhẹ hơn Redux (~1KB)
  - API đơn giản hơn
  - Không cần Provider/Context
  - TypeScript support tốt
- **Sử dụng trong dự án**:
  - Store room state (players, phase, game state)
  - Local player info
  - UI state (loading, errors)
  - Integration với Socket.IO events

### **Tailwind CSS** - Styling

- **Phiên bản**: ^3.4.1
- **Packages**:
  - `tailwindcss` - CSS framework
  - `autoprefixer` - Auto add vendor prefixes
  - `postcss` - CSS transformation
- **Chức năng**: Utility-first CSS framework
- **Sử dụng trong dự án**:
  - Rapid UI development
  - Responsive design (mobile-first)
  - Custom color palette (primary colors)
  - Consistent spacing/sizing

---

## 🛠️ Development Tools

### **ESLint**

- **Chức năng**: Code linting
- **Plugins**:
  - `@typescript-eslint/eslint-plugin` - TypeScript rules
  - `@typescript-eslint/parser` - Parse TypeScript
  - `eslint-config-prettier` - Tắt rules conflict với Prettier
  - `eslint-config-next` - Next.js specific rules (frontend)
- **Sử dụng**: Đảm bảo code quality, consistent coding style

### **Prettier**

- **Phiên bản**: ^3.2.4
- **Chức năng**: Code formatting
- **Config**: `.prettierrc` với single quotes, 2 spaces, semicolons
- **Sử dụng**: Auto-format code, đảm bảo consistent formatting

### **Concurrently**

- **Phiên bản**: ^8.2.2
- **Chức năng**: Run multiple commands concurrently
- **Sử dụng**: Script `pnpm dev` chạy đồng thời backend và frontend

---

## 📊 Tổng kết Dependencies theo chức năng

| Chức năng            | Backend           | Frontend          | Shared      |
| -------------------- | ----------------- | ----------------- | ----------- |
| **Core Framework**   | NestJS            | Next.js + React   | -           |
| **Real-time**        | Socket.IO server  | Socket.IO client  | Event types |
| **Validation**       | Zod               | Zod               | Zod schemas |
| **State Management** | In-memory Map     | Zustand           | -           |
| **Styling**          | -                 | Tailwind CSS      | -           |
| **Type Safety**      | TypeScript        | TypeScript        | TypeScript  |
| **Testing**          | Jest              | -                 | Jest        |
| **Code Quality**     | ESLint + Prettier | ESLint + Prettier | ESLint      |

---

## 🚀 Scripts Available

### Root level:

```bash
pnpm dev              # Run backend + frontend concurrently
pnpm dev:backend      # Run backend only (port 3001)
pnpm dev:frontend     # Run frontend only (port 3000)
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format all code with Prettier
pnpm test             # Run all tests
```

### Backend:

```bash
pnpm start:dev        # Development mode with watch
pnpm build            # Build for production
pnpm start:prod       # Run production build
pnpm test             # Run tests
```

### Frontend:

```bash
pnpm dev              # Development mode (localhost:3000)
pnpm build            # Build for production
pnpm start            # Run production build
pnpm lint             # Lint code
```

### Shared:

```bash
pnpm build            # Compile TypeScript
pnpm dev              # Watch mode
pnpm test             # Run ticket generator tests
```

---

## 📝 Lưu ý quan trọng

1. **Workspace linking**: Các package được link tự động qua `workspace:*` - không cần publish
2. **Type safety end-to-end**: Types từ `shared` được dùng ở cả FE và BE
3. **Hot reload**: Thay đổi trong `shared` sẽ trigger rebuild ở FE/BE (nếu đang watch mode)
4. **No database**: Phase 0 dùng in-memory state (Map) - sẽ mất khi restart server
