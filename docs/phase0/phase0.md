PHASE 0 – Khóa đặc tả & dựng nền tảng kỹ thuật
0.1 Mục tiêu Phase 0

Chốt spec Family Mode (Guest) + luật vé 9×9 (cột 3–6 số) + turn/mark/no-number + waiting + bingo claim.

Dựng monorepo FE/BE chạy được.

Định nghĩa event contract (Socket.IO) + data model dùng chung FE/BE (TypeScript + Zod).

Làm ticket generator (ít nhất bản “đúng luật + ổn định”) + test nhanh.

Không cần làm UI đẹp hay đầy đủ gameplay ở Phase 0 — chỉ tạo nền để Phase 1/2 triển khai nhanh.

0.2 Đặc tả “đóng băng” (Spec Freeze) cho Family Mode
A) Luật vé (Ticket Rules)

Grid 9×9

Mỗi hàng ngang: đúng 5 số, 4 ô trống

Mỗi cột dọc:

Cột 1: 1–9

Cột 2: 10–19

…

Cột 9: 80–90

Mỗi cột có 3–6 số

Vé random, user reroll nhiều lần

Save/Ready → khóa vé cho ván đó

Tổng số trên vé = 9×5 = 45. Với ràng buộc cột 3–6 (9 cột) vẫn hợp lệ.

B) Family Mode (Guest)

Host tạo room, người chơi xin vào bằng: name + balance

Host duyệt và chỉnh balance

Player/host chọn vé → Ready

Khi tất cả ready (+ host ready), host Start

Mỗi lượt:

Host Draw

Mỗi user phải phản hồi:

Mark đúng ô nếu có số

Nếu không có số: bấm “Không có”

Chỉ khi mọi người đã phản hồi → host mới draw tiếp

C) Waiting + Bingo

Khi user có 4/5 ở 1 hàng → public “số đợi” (số còn thiếu) cho cả phòng

Khi đủ 5/5 → hiện nút Bingo để user bấm (claim thủ công)

Claim đúng → winner, dừng game

Host restart → quay về màn gen vé

0.3 Kiến trúc & công nghệ “chốt” cho Phase 0

FE

Next.js + TypeScript

socket.io-client

Zustand (state nhẹ)

Tailwind (có thể thêm sau)

BE

NestJS + TypeScript

Socket.IO gateway

Shared

packages/shared: types + zod schemas + event map

Lưu ý Phase 0

Chưa cần DB. Toàn bộ state giữ in-memory (Map rooms).

0.4 Monorepo setup (cấu trúc + tooling)
Output mong muốn

apps/web chạy dev

apps/api chạy dev

packages/shared build được và dùng chung type/schema

Lint/format thống nhất

Cấu trúc gợi ý
/apps
/web (Next.js)
/api (NestJS)
/packages
/shared (types + zod schemas + helpers)
pnpm-workspace.yaml
turbo.json (optional)

Checklist kỹ thuật

pnpm workspace chạy được

tsconfig.base.json dùng chung

ESLint + Prettier áp dụng toàn repo

packages/shared export được type cho FE/BE (ESM/CJS thống nhất)

0.5 Contract realtime (Socket.IO) – chuẩn hóa ngay từ đầu
A) Danh sách event (Family Mode)

Client → Server

room:create

room:requestJoin { name, balance }

room:approveJoin { requestId } (host)

room:rejectJoin { requestId } (host)

room:updateBalance { playerId, balance } (host)

ticket:reroll

ticket:saveReady

game:start (host)

turn:draw (host)

turn:mark { turnId, row, col }

turn:noNumber { turnId }

game:bingoClaim

game:restart (host)

Server → Client

room:state { ...RoomState } (broadcast mọi thay đổi)

turn:new { turnId, number }

turn:progress { turnId, pendingPlayerIds } (gửi khi host bốc sớm)

waiting:update { waitingBoard }

game:ended { winner }

error { code, message }

B) Payload & validation runtime (Zod)

Phase 0 nên làm luôn:

zod schema cho từng payload quan trọng

BE validate input trước khi xử lý

FE dùng schema để type-safe + tránh gửi sai

Ví dụ khung shared (minh họa):

// packages/shared/schemas.ts
import { z } from "zod";

export const JoinRequestSchema = z.object({
name: z.string().min(1).max(24),
balance: z.number().int().min(0).max(1_000_000),
});

export const MarkSchema = z.object({
turnId: z.number().int().nonnegative(),
row: z.number().int().min(0).max(8),
col: z.number().int().min(0).max(8),
});

Definition of Done cho contract

FE/BE cùng import type/schema từ shared

Tất cả event quan trọng có schema

BE trả error {code} thống nhất

0.6 Data model (Room/Game/Ticket) – khóa structure
RoomState (gợi ý)

phase: LOBBY | TICKET_PICK | PLAYING | ENDED

hostId

players[]:

id, name, balance, isHost

status: PENDING | APPROVED

ready: boolean

ticket?: Ticket

marked?: boolean[9][9] (sau khi start)

respondedTurnId?: number (để chặn double response)

pendingRequests[]: {requestId, name, balance, createdAt}

game?:

turnId

activeNumber?

drawnNumbers[]

turnResponses: Record<playerId, "MARKED"|"NO_NUMBER">

waitingBoard

Ticket type

Ticket = (number | null)[][] kích thước 9×9

Definition of Done

Có types.ts trong shared export đầy đủ RoomState/Ticket/GameState

Không đổi shape tùy tiện khi sang Phase 1

0.7 Ticket Generator theo luật mới (cột 3–6) + test harness

Phase 0 cần ít nhất 1 bản generator:

Luôn ra vé hợp lệ

Tốc độ đủ nhanh để reroll nhiều lần

Invariants cần kiểm

9 hàng, mỗi hàng đúng 5 số

Số trong cột thuộc đúng range

Mỗi cột có 3..6 số

Không trùng số trong 1 vé

Tổng số = 45

Gợi ý hướng implement (đáng tin cho Phase 0)

Sinh colCounts[9] sao cho:

mỗi cột trong [3..6]

tổng = 45
(VD: bắt đầu [5..5] rồi random adjust nhưng vẫn giữ [3..6])

Dùng thuật toán fill mask 9×9 để đạt:

row sum = 5

col sum = colCounts[c]
(backtracking nhỏ hoặc greedy + sửa lỗi; 9×9 đủ nhỏ để backtracking ổn)

Đổ số theo từng cột:

lấy đúng colCounts[c] số unique từ range

sort tăng dần theo hàng (đẹp/ổn định)

Test harness (rất nên làm ngay)

Script generate 1,000–10,000 vé → assert invariants

Nếu fail → log seed để debug

Definition of Done

Generate 10,000 vé không fail rule

Hàm validateTicket(ticket) có sẵn để dùng ở BE khi cần

0.8 UX wireframe tối thiểu (để Phase 1 làm nhanh)

Chỉ cần phác nhanh luồng màn hình (không cần đẹp):

Home: Create Room / Join Room

Join Request: nhập name + balance

Host Lobby: pending + approve/reject + edit balance

Ticket Pick: reroll + save ready + list ready status

Game: số đang bốc + board + nút “Không có” + bingo button khi đủ

Definition of Done

Có danh sách component/screen cần tạo trong Phase 1

0.9 Quy ước lỗi & quyền (tránh mập mờ)
Quyền host-only

approve/reject

update balance

start game

draw

restart

Error codes thống nhất (ví dụ)

NOT_HOST

ROOM_NOT_FOUND

NOT_READY_ALL

TURN_NOT_ACTIVE

INVALID_MARK

CANNOT_NO_NUMBER_HAVE_NUMBER

ALREADY_RESPONDED

Definition of Done

error codes nằm trong shared enum

0.10 Definition of Done (PHASE 0)

Bạn coi Phase 0 “xong” khi:

Repo FE/BE/shared chạy dev OK

Shared contract (types + zod) đã khóa, event list rõ ràng

Room/Game/Ticket model đã chốt

Ticket generator + validateTicket có test harness pass

Có wireframe màn hình & luồng
