# Phase 0 Implementation Tasks

## 0.4 Monorepo Setup

- [x] Create monorepo structure (apps/web, apps/api, packages/shared)
- [x] Setup pnpm workspace
- [x] Configure tsconfig.base.json
- [x] Setup ESLint + Prettier
- [x] Verify package linking works

## 0.5 Contract & Shared Package

- [ ] Define TypeScript types (RoomState, Ticket, GameState, Player)
- [ ] Create Zod schemas for validation
- [ ] Define Socket.IO event map and payloads
- [ ] Define error codes enum
- [ ] Build and export shared package

## 0.6 Data Models

- [ ] Define RoomState structure
- [ ] Define GameState structure
- [ ] Define Ticket type (9x9 grid)
- [ ] Define Player model with status/ready flags

## 0.7 Ticket Generator

- [ ] Implement ticket generation algorithm (9x9, columns 3-6 numbers)
- [ ] Create validateTicket function
- [ ] Build test harness (10,000 tickets)
- [ ] Verify all invariants pass

## 0.8 Backend (NestJS)

- [ ] Initialize NestJS app in apps/api
- [ ] Setup Socket.IO gateway
- [ ] Implement in-memory room management
- [ ] Implement all Socket.IO event handlers
- [ ] Add Zod validation for all inputs
- [ ] Test backend in isolation

## 0.9 Frontend (Next.js)

- [ ] Initialize Next.js app in apps/web
- [ ] Setup socket.io-client
- [ ] Setup Zustand state management
- [ ] Create basic screen structure (wireframe)
- [ ] Implement Socket.IO client connection
- [ ] Test connection with backend

## 0.10 Integration & Verification

- [ ] Test full flow: create room → join → ticket pick → game → bingo
- [ ] Verify error handling
- [ ] Document setup instructions
- [ ] Create Phase 0 completion walkthrough
