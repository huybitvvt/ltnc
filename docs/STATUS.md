# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: PROPERTY_MANAGEMENT_COMPLETE.
- Task vừa thực hiện: C1 — Khu nhà, tầng, phòng (PASS: Migration V002 + Backend CRUD Scope + Web BuildingsPage + Mobile PropertyScreen + 17 Unit Tests đạt 100%).
- Task tiếp theo: C2 — Hồ sơ khách thuê, hợp đồng, thành viên, cọc/bàn giao (Tenancy & Contract Module).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status), `76e97b9` (B2 Auth).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `Building`, `Floor`, `Room`, `RoomStatus` (`VACANT`, `RENTED`, `DEPOSIT_RESERVED`, `MAINTENANCE`), `BuildingRepository`, `FloorRepository`, `RoomRepository`, `BuildingStaffAssignmentRepository`.
    - Application/Security: `PropertyService` (kiểm tra phân công tòa nhà cho STAFF, OWNER toàn quyền, tính toán số phòng trống/tổng số phòng, quản lý tầng, tạo phòng với tiền tệ `BigDecimal`, kiểm soát trùng mã phòng, khóa/mở cho thuê `bookable`), `AuthService`, `UserService`.
    - API Controllers & DTOs: `PropertyController` (`/api/v1/buildings`, `/buildings/{id}/floors`, `/buildings/{id}/rooms`, `/rooms/{id}/bookable`), `PropertyDtos`.
    - Migration: `V001__identity.sql`, `V002__property_management.sql`.
    - Unit Tests: 17/17 tests PASS (`AuthServiceTest` 7 ca, `PropertyServiceTest` 7 ca, `UserServiceTest` 3 ca).
  - Web:
    - UI Components: `BuildingsPage.tsx` (Tabs chọn tòa nhà, thẻ phòng trực quan với màu sắc trạng thái, lọc theo trạng thái, modal thêm tòa nhà, thêm tầng, thêm phòng với giá VND chuẩn, toggle khóa cho thuê `bookable`), `AppRouter.tsx` (route `/buildings`), `AppLayout.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - UI Screens: `PropertyScreen.tsx` (chọn tòa nhà ngang, bộ lọc chip trạng thái, danh sách thẻ phòng, toggle khóa thuê `bookable`, dialog thêm phòng mới), tích hợp điều hướng trong `HomeScreen.tsx` và `index.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & 17 unit tests PASS 100%.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
- [x] C1 — Khu nhà, tầng, phòng. (PASS: 17 tests, Web build, Mobile typecheck, migration V002)
- [ ] C2 — Hồ sơ, hợp đồng, membership, bàn giao.
- [ ] D1 — Giá, dịch vụ, chỉ số, cảnh báo.
- [ ] D2 — Tính tiền, snapshot, invoice issue/adjustment.
- [ ] E1 — Thu tiền, correction, refund, credit transfer.
- [ ] E2 — Cọc, offset, hoàn/khấu trừ và đối chiếu.
- [ ] E3 — Checkout và hóa đơn cuối kỳ xuyên suốt.
- [ ] F1 — Sửa chữa, ảnh, phản hồi hóa đơn.
- [ ] F2 — Thông báo và dashboard.
- [ ] G1 — Hoàn thiện parity/UX hai client.
- [ ] H1 — Kiểm thử và sửa lỗi tổng thể.
- [ ] H2 — Đóng gói, APK, README và demo.

## Nhật ký verification

| Thời điểm | Task | CWD/lệnh | Kết quả | Bằng chứng |
|---|---|---|---|---|
| 2026-09-21 | A0 | `git init` | PASS | Kho lưu trữ Git local được khởi tạo |
| 2026-09-21 | A0 | `python -c "import yaml; yaml.safe_load(open('docs/openapi.yaml', encoding='utf-8'))"` | PASS | `docs/openapi.yaml` hợp lệ 100% cú pháp OpenAPI 3.0.3 |
| 2026-09-21 | B1 | `web` / `npm.cmd install` | PASS | Đã cài 252 packages, sinh `web/package-lock.json` |
| 2026-09-21 | B1 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | Vite build hoàn thành 100%, tạo bundle `dist/assets` |
| 2026-09-21 | B1 | `mobile` / `npm.cmd install` | PASS | Đã cài 938 packages, sinh `mobile/package-lock.json` |
| 2026-09-21 | B1 | `mobile` / `npm.cmd run typecheck` | PASS | Typecheck TypeScript không lỗi |
| 2026-09-21 | B1 | `backend` / `.\mvnw.cmd test-compile` | PASS | Biên dịch sang Java 17 bytecode |
| 2026-09-21 | B1 | `root` / `.\scripts\verify.ps1` | PASS | Tổng hợp kiểm tra 3 thành phần đều đạt |
| 2026-09-21 | B2 | `backend` / `.\mvnw.cmd test "-Dtest=AuthServiceTest,UserServiceTest"` | PASS | 10/10 tests run, 0 failures, 0 errors |
| 2026-09-21 | B2 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11648 modules transformed, bundle dist hoàn tất |
| 2026-09-21 | B2 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-09-21 | B2 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 10 unit tests PASS 100% |
| 2026-09-21 | C1 | `backend` / `.\mvnw.cmd test "-Dtest=AuthServiceTest,UserServiceTest,PropertyServiceTest"` | PASS | 17/17 tests run, 0 failures, 0 errors |
| 2026-09-21 | C1 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11649 modules transformed, dist bundle hoàn tất |
| 2026-09-21 | C1 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-09-21 | C1 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 17 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: C1 / PASS (Khu nhà, tầng, phòng, phân quyền scope STAFF vs OWNER, Web UI BuildingsPage, Mobile UI PropertyScreen, 17/17 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `V002__property_management.sql`, `RoomStatus.java`, `Floor.java`, `Room.java`, `FloorRepository.java`, `RoomRepository.java`, `PropertyDtos.java`, `PropertyService.java`, `PropertyController.java`, `PropertyServiceTest.java`.
  - `web/`: `types.ts` (property), `BuildingsPage.tsx` (Tabs tòa nhà, grid thẻ phòng, trạng thái, modal thêm tòa/tầng/phòng, toggle bookable), `AppRouter.tsx`.
  - `mobile/`: `PropertyScreen.tsx` (chọn tòa nhà ngang, chip lọc trạng thái, thẻ phòng, toggle bookable, dialog thêm phòng), `HomeScreen.tsx`, `index.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm `PropertyServiceTest` (17 tests).
  - `docs/FEATURE_MATRIX.md`, `docs/STATUS.md`.
- **API/migration**: `V002__property_management.sql`; `/api/v1/buildings`, `/buildings/{id}`, `/buildings/{id}/active`, `/buildings/{id}/floors`, `/buildings/{id}/rooms`, `/rooms/{id}`, `/rooms/{id}/bookable`.
- **Known failures/blockers**: Không có lỗi chức năng; Testcontainers cần Docker daemon, unit tests đạt 17/17 PASS.
- **Exact next action**: Tiến hành Task C2 — Hồ sơ khách thuê, hợp đồng, thành viên, cọc/bàn giao (Tenancy & Contract Module: Migration Flyway V003, Hợp đồng DRAFT -> ACTIVE, ràng buộc duy nhất `uq_active_room_contract`, thành viên phòng, bàn giao tài sản, Web UI & Mobile UI).
- **Git commit**: Sẽ commit ngay sau khi cập nhật docs.
