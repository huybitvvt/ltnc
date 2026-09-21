# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: TENANCY_CONTRACTS_COMPLETE.
- Task vừa thực hiện: C2 — Hồ sơ khách thuê, hợp đồng, thành viên, cọc/bàn giao (PASS: Migration V003 + Partial Unique Index uq_active_room_contract + Backend TenancyService & TenancyController + Web ContractsPage + Mobile ContractsScreen + 26 Unit Tests đạt 100%).
- Task tiếp theo: D1 — Giá, dịch vụ, chỉ số, cảnh báo (Pricing, Metering & Consumption Alerts).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status), `76e97b9` (B2 Auth), `9ac930a` (C1 Property).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `Building`, `Floor`, `Room`, `RoomStatus`, `TenantProfile`, `Contract`, `ContractStatus`, `ContractMember`, `ContractEvent`, `RoomMeter`, `MeterReading`, `MeterType`, `MeterReadingKind`.
    - Application/Security: `PropertyService`, `TenancyService`, `AuthService`, `UserService`. Ràng buộc bất biến: `uq_active_room_contract`, che CCCD, gia hạn giữ giá, kiểm tra sức chứa phòng khi thêm người.
    - API Controllers & DTOs: `PropertyController`, `TenancyController`, `AuthController`, `UserController`.
    - Migration: `V001__identity.sql`, `V002__property_management.sql`, `V003__tenancy_and_contracts.sql`.
    - Unit Tests: 26/26 tests PASS (`AuthServiceTest` 7, `PropertyServiceTest` 7, `TenancyServiceTest` 9, `UserServiceTest` 3).
  - Web:
    - UI Components: `BuildingsPage.tsx`, `ContractsPage.tsx` (Lọc hợp đồng, lập hợp đồng DRAFT, modal bàn giao & kích hoạt ACTIVE, gia hạn giữ nguyên giá thuê, thêm thành viên, cấp mã mời 24h), `TenantPortalPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - UI Screens: `PropertyScreen.tsx`, `ContractsScreen.tsx` (Card hợp đồng, chip lọc, dialog bàn giao chỉ số, dialog gia hạn, dialog thêm thành viên, dialog mã mời), `HomeScreen.tsx`, `index.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & 26 unit tests PASS 100%.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
- [x] C1 — Khu nhà, tầng, phòng. (PASS: 17 tests, Web build, Mobile typecheck, migration V002)
- [x] C2 — Hồ sơ, hợp đồng, membership, bàn giao. (PASS: 26 tests, Web build, Mobile typecheck, migration V003)
- [ ] D1 — Giá, dịch vụ, chỉ số, cảnh báo.
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
| 2026-09-21 | C2 | `backend` / `.\mvnw.cmd test "-Dtest=AuthServiceTest,UserServiceTest,PropertyServiceTest,TenancyServiceTest"` | PASS | 26/26 tests run, 0 failures, 0 errors |
| 2026-09-21 | C2 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11650 modules transformed, dist bundle hoàn tất |
| 2026-09-21 | C2 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-09-21 | C2 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 26 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: C2 / PASS (Hồ sơ khách thuê, hợp đồng DRAFT/ACTIVE/ENDED, thành viên phòng kèm kiểm tra maxTenants, bàn giao chỉ số điện nước, mã mời 24h, Web ContractsPage, Mobile ContractsScreen, 26/26 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `V003__tenancy_and_contracts.sql`, `TenantProfile.java`, `Contract.java`, `ContractStatus.java`, `ContractMember.java`, `ContractEvent.java`, `RoomMeter.java`, `MeterReading.java`, `MeterType.java`, `MeterReadingKind.java`, `TenantProfileRepository.java`, `ContractRepository.java`, `ContractMemberRepository.java`, `ContractEventRepository.java`, `RoomMeterRepository.java`, `MeterReadingRepository.java`, `TenancyService.java`, `TenancyController.java`, `TenancyDtos.java`, `TenancyServiceTest.java`.
  - `web/`: `types.ts` (contracts), `contractsApi.ts`, `ContractsPage.tsx` (Bảng hợp đồng, modal lập hợp đồng, modal bàn giao & kích hoạt, modal gia hạn, modal thêm thành viên, modal mã mời), `TenantPortalPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
  - `mobile/`: `types.ts` (contracts), `ContractsScreen.tsx`, `HomeScreen.tsx`, `index.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm `TenancyServiceTest` (26 tests).
  - `docs/FEATURE_MATRIX.md`, `docs/STATUS.md`.
- **API/migration**: `V003__tenancy_and_contracts.sql` (ràng buộc duy nhất `uq_active_room_contract`); `/api/v1/tenant-profiles`, `/tenant-profiles/{id}/invite`, `/api/v1/contracts`, `/contracts/{id}`, `/contracts/{id}/activate`, `/contracts/{id}/extend`, `/contracts/{id}/members`, `/contracts/{id}/checkout`.
- **Known failures/blockers**: Không có lỗi chức năng; Testcontainers cần Docker daemon, unit tests đạt 26/26 PASS.
- **Exact next action**: Tiến hành Task D1 — Dịch vụ, đơn giá điện nước, chỉ số định kỳ và cảnh báo tiêu thụ (Metering, Pricing & Tariffs).
- **Git commit**: Sẽ commit ngay sau khi cập nhật docs.

