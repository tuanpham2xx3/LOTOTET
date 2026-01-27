# Phase 0 Implementation Plan - LOTOTET Game

## Overview

This plan implements Phase 0 of the LOTOTET Bingo game, establishing the technical foundation for a multiplayer Family Mode game with real-time Socket.IO communication.

## User Review Required

> [!IMPORTANT]
> **Technology Stack Confirmation**
>
> - Frontend: Next.js + TypeScript + socket.io-client + Zustand + Tailwind CSS
> - Backend: NestJS + TypeScript + Socket.IO
> - Shared: Zod for runtime validation
> - Package Manager: pnpm
> - No database (in-memory state only for Phase 0)
>
> Please confirm this stack is acceptable before proceeding.

> [!WARNING]
> **Ticket Generation Algorithm Complexity**
> The 9×9 grid with column constraints (3-6 numbers per column, total 45 numbers) requires a non-trivial algorithm. I'll implement a backtracking approach with validation, but initial generation might take some iterations to perfect.

## Proposed Changes

### Shared Package Foundation

#### [NEW] [package.json](file:///c:/PROJECT/LOTOTET/packages/shared/package.json)

Shared package configuration with TypeScript, Zod, and proper exports for ESM/CJS compatibility.

#### [NEW] [types.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/types.ts)

Core TypeScript type definitions:

- `Ticket`: 9×9 grid type `(number | null)[][]`
- `Player`: Player state with id, name, balance, ticket, marked grid, status
- `RoomState`: Complete room state including phase, players, pending requests
- `GameState`: Turn management, drawn numbers, responses, waiting board
- `RoomPhase`: enum for LOBBY | TICKET_PICK | PLAYING | ENDED
- `PlayerStatus`: enum for PENDING | APPROVED

#### [NEW] [schemas.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/schemas.ts)

Zod validation schemas:

- `JoinRequestSchema`: name (1-24 chars), balance (0-1M)
- `MarkSchema`: turnId, row (0-8), col (0-8)
- `NoNumberSchema`: turnId
- `UpdateBalanceSchema`: playerId, balance
- Request/response schemas for all Socket.IO events

#### [NEW] [events.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/events.ts)

Socket.IO event type definitions:

- Client → Server events (create, join, approve, draw, mark, bingo, etc.)
- Server → Client events (room:state, turn:new, waiting:update, game:ended)
- Typed event map for type-safe Socket.IO usage

#### [NEW] [errors.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/errors.ts)

Error code enums:

- `NOT_HOST`, `ROOM_NOT_FOUND`, `NOT_READY_ALL`
- `TURN_NOT_ACTIVE`, `INVALID_MARK`, `ALREADY_RESPONDED`
- `CANNOT_NO_NUMBER_HAVE_NUMBER`

#### [NEW] [ticketGenerator.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/ticketGenerator.ts)

Ticket generation algorithm:

- Generate valid column counts (3-6 per column, sum = 45)
- Create 9×9 mask satisfying row/column constraints
- Fill numbers respecting column ranges (col 0: 1-9, col 1: 10-19, ..., col 8: 80-90)
- Sort numbers within columns for visual consistency

#### [NEW] [ticketValidator.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/ticketValidator.ts)

Validation function checking all invariants:

- 9 rows × 9 columns
- Each row has exactly 5 numbers
- Each column has 3-6 numbers
- Column numbers in correct range
- No duplicate numbers
- Total 45 numbers

#### [NEW] [index.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/index.ts)

Main export file re-exporting all types, schemas, events, and utilities.

---

### Backend (NestJS API)

#### [NEW] [main.ts](file:///c:/PROJECT/LOTOTET/apps/api/src/main.ts)

NestJS bootstrap with Socket.IO CORS configuration.

#### [NEW] [app.module.ts](file:///c:/PROJECT/LOTOTET/apps/api/src/app.module.ts)

Root module importing GameGateway.

#### [NEW] [game.gateway.ts](file:///c:/PROJECT/LOTOTET/apps/api/src/game/game.gateway.ts)

Main Socket.IO gateway implementing all event handlers:

- Room management (create, join, approve/reject)
- Ticket management (reroll, save/ready)
- Game flow (start, draw, mark, no-number, bingo claim, restart)
- State broadcasting
- Zod validation for all inputs
- Host permission checks

#### [NEW] [room.service.ts](file:///c:/PROJECT/LOTOTET/apps/api/src/game/room.service.ts)

In-memory room state management:

- `Map<roomId, RoomState>` storage
- CRUD operations for rooms
- Player management
- Game state transitions
- Turn response tracking
- Waiting board calculations

#### [NEW] [package.json](file:///c:/PROJECT/LOTOTET/apps/api/package.json)

NestJS dependencies including @nestjs/websockets, @nestjs/platform-socket.io, and shared package.

#### [NEW] [tsconfig.json](file:///c:/PROJECT/LOTOTET/apps/api/tsconfig.json)

TypeScript configuration extending base config.

---

### Frontend (Next.js Web)

#### [NEW] [package.json](file:///c:/PROJECT/LOTOTET/apps/web/package.json)

Next.js app dependencies including socket.io-client, Zustand, Tailwind CSS, and shared package.

#### [NEW] [useSocket.ts](file:///c:/PROJECT/LOTOTET/apps/web/src/hooks/useSocket.ts)

Custom React hook for Socket.IO connection management with typed events.

#### [NEW] [useGameStore.ts](file:///c:/PROJECT/LOTOTET/apps/web/src/store/useGameStore.ts)

Zustand store for:

- Current room state
- Local player info
- UI state (loading, errors)
- Socket event handlers integration

#### [NEW] [page.tsx](file:///c:/PROJECT/LOTOTET/apps/web/src/app/page.tsx)

Home page with Create Room / Join Room options.

#### [NEW] [JoinModal.tsx](file:///c:/PROJECT/LOTOTET/apps/web/src/components/JoinModal.tsx)

Modal for entering name + balance when joining a room.

#### [NEW] [HostLobby.tsx](file:///c:/PROJECT/LOTOTET/apps/web/src/components/HostLobby.tsx)

Host view showing:

- Pending join requests (approve/reject)
- Player list with balance editing
- Ready status
- Start game button

#### [NEW] [TicketPicker.tsx](file:///c:/PROJECT/LOTOTET/apps/web/src/components/TicketPicker.tsx)

Ticket selection screen:

- Display 9×9 grid
- Reroll button
- Save & Ready button
- Show other players' ready status

#### [NEW] [GameBoard.tsx](file:///c:/PROJECT/LOTOTET/apps/web/src/components/GameBoard.tsx)

Main game interface:

- Current drawn number display
- Player's ticket with mark/empty cells
- "Không có" (No number) button
- Bingo claim button (when eligible)
- Waiting numbers display for all players
- Turn response status

#### [NEW] [tailwind.config.js](file:///c:/PROJECT/LOTOTET/apps/web/tailwind.config.js)

Tailwind CSS configuration.

---

### Monorepo Configuration

#### [NEW] [pnpm-workspace.yaml](file:///c:/PROJECT/LOTOTET/pnpm-workspace.yaml)

Workspace definition for apps/_ and packages/_.

#### [NEW] [tsconfig.base.json](file:///c:/PROJECT/LOTOTET/tsconfig.base.json)

Shared TypeScript configuration with path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@lototet/shared": ["./packages/shared/src"]
    }
  }
}
```

#### [NEW] [.eslintrc.js](file:///c:/PROJECT/LOTOTET/.eslintrc.js)

ESLint configuration for TypeScript + React.

#### [NEW] [.prettierrc](file:///c:/PROJECT/LOTOTET/.prettierrc)

Prettier formatting rules.

#### [NEW] [package.json](file:///c:/PROJECT/LOTOTET/package.json)

Root package.json with workspace scripts:

- `dev:web`: Run Next.js dev server
- `dev:api`: Run NestJS dev server
- `dev`: Run both concurrently
- `build`: Build all packages
- `lint`: Lint all packages
- `format`: Format all code

---

### Testing & Validation

#### [NEW] [ticketGenerator.test.ts](file:///c:/PROJECT/LOTOTET/packages/shared/src/__tests__/ticketGenerator.test.ts)

Test harness generating 10,000 tickets and validating:

- All invariants pass
- No generation failures
- Performance benchmarks
- Seed logging for reproducibility

## Verification Plan

### Automated Tests

1. **Shared Package Tests**

   ```bash
   cd packages/shared
   pnpm test
   ```

   - Generate 10,000 tickets, verify all pass validation
   - Test Zod schemas with valid/invalid inputs

2. **Backend Tests**

   ```bash
   cd apps/api
   pnpm test
   ```

   - Unit tests for room service
   - Integration tests for Socket.IO events

### Manual Verification

1. **Monorepo Setup**

   ```bash
   pnpm install
   pnpm build
   pnpm dev
   ```

   - Verify both apps start without errors
   - Check HMR works

2. **Full Game Flow (2 Browser Windows)**
   - Window 1 (Host):
     1. Create room
     2. Approve join request from Window 2
     3. Generate and save ticket
     4. Start game when both ready
     5. Draw numbers
     6. Verify waiting updates appear
   - Window 2 (Player):
     1. Join room (name + balance)
     2. Generate and save ticket
     3. Mark numbers or click "Không có"
     4. Claim bingo when eligible

3. **Error Handling**
   - Try to start game when not all ready → expect error
   - Try to draw as non-host → expect NOT_HOST error
   - Try to mark invalid cell → expect INVALID_MARK error
   - Try to respond twice to same turn → expect ALREADY_RESPONDED error

4. **UI/UX Validation**
   - All screens render correctly
   - Ticket displays properly (9×9 grid)
   - Real-time updates work (room state, turns, waiting)
   - Buttons enable/disable appropriately

## Implementation Order

1. **Setup Monorepo** (0.5-1 hour)
   - Create folder structure
   - Configure pnpm workspace
   - Setup base configs

2. **Build Shared Package** (2-3 hours)
   - Define types and schemas
   - Implement ticket generator
   - Write validation tests

3. **Backend Implementation** (3-4 hours)
   - Setup NestJS + Socket.IO
   - Implement room service
   - Implement gateway event handlers
   - Test with Socket.IO client tool

4. **Frontend Implementation** (4-5 hours)
   - Setup Next.js + Zustand
   - Create all components
   - Wire up Socket.IO
   - Build basic UI (wireframe quality)

5. **Integration Testing** (1-2 hours)
   - Test full flow
   - Fix bugs
   - Verify error cases

**Total Estimated Time**: 11-15 hours
