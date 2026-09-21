# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: PRICING_METERING_COMPLETE.
- Task vừa thực hiện: D1 — Giá, dịch vụ, chỉ số, cảnh báo (PASS: Migration V004 + CSDL biểu giá/dịch vụ/cấu hình hạn nợ/cảnh báo tiêu thụ + Backend PricingService, MeteringService, PricingController, MeteringController + Web MeteringPage + Mobile MeteringScreen + 40 Unit Tests đạt 100%).
- Task tiếp theo: D2 — Tính tiền, snapshot, invoice issue/adjustment (Invoicing & Adjustments).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status), `76e97b9` (B2 Auth), `9ac930a` (C1 Property), `d66200a` (C2 Tenancy).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `Building`, `Floor`, `Room`, `TenantProfile`, `Contract`, `ContractMember`, `RoomMeter`, `MeterReading`, `ServiceDefinition`, `Tariff`, `ContractServiceSubscription`, `BuildingBillingSettings`, `OneOffCharge`, `ConsumptionAlert`.
    - Application/Security: `PropertyService`, `TenancyService`, `AuthService`, `UserService`, `PricingService`, `MeteringService`. Ràng buộc bất biến: `uq_active_room_contract`, `uq_building_service_month` (BR-066), chỉ số mới >= chỉ số cũ (BR-059), tìm đơn giá hiệu lực `effectiveMonth <= billingMonth` (BR-067), thuật toán phát hiện cảnh báo tiêu thụ `> 2 * median` và `diff >= threshold` (BR-141), xác nhận số đúng có giải trình (BR-145).
    - API Controllers & DTOs: `PropertyController`, `TenancyController`, `AuthController`, `UserController`, `PricingController`, `MeteringController`.
    - Migration: `V001__identity.sql`, `V002__property_management.sql`, `V003__tenancy_and_contracts.sql`, `V004__pricing_and_tariffs.sql`.
    - Unit Tests: 40/40 tests PASS (`AuthServiceTest` 7, `PropertyServiceTest` 7, `TenancyServiceTest` 9, `UserServiceTest` 3, `PricingServiceTest` 8, `MeteringServiceTest` 6).
  - Web:
    - UI Components: `BuildingsPage.tsx`, `ContractsPage.tsx`, `MeteringPage.tsx` (Ghi chỉ số định kỳ, cảnh báo bất thường, biểu giá dịch vụ, cấu hình hạn nợ & ngưỡng cảnh báo), `TenantPortalPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - UI Screens: `PropertyScreen.tsx`, `ContractsScreen.tsx`, `MeteringScreen.tsx` (Ghi chỉ số định kỳ, chip tabs, xác nhận cảnh báo có giải trình, danh sách bảng giá), `HomeScreen.tsx`, `index.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & 40 unit tests PASS 100%.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
- [x] C1 — Khu nhà, tầng, phòng. (PASS: 17 tests, Web build, Mobile typecheck, migration V002)
- [x] C2 — Hồ sơ, hợp đồng, membership, bàn giao. (PASS: 26 tests, Web build, Mobile typecheck, migration V003)
- [x] D1 — Giá, dịch vụ, chỉ số, cảnh báo. (PASS: 40 tests, Web build, Mobile typecheck, migration V004)
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
| 2026-09-21 | D1 | `backend` / `.\mvnw.cmd test "-Dtest=PricingServiceTest,MeteringServiceTest"` | PASS | 14/14 tests run, 0 failures, 0 errors |
| 2026-09-21 | D1 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11653 modules transformed, dist bundle hoàn tất |
| 2026-09-21 | D1 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-09-21 | D1 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 40 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: D1 / PASS (Dịch vụ, đơn giá biểu giá tòa nhà theo tháng, chỉ số điện nước định kỳ, cảnh báo tiêu thụ bất thường 3 kỳ, Web MeteringPage, Mobile MeteringScreen, 40/40 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `V004__pricing_and_tariffs.sql`, `ServiceDefinition.java`, `Tariff.java`, `ContractServiceSubscription.java`, `BuildingBillingSettings.java`, `OneOffCharge.java`, `ConsumptionAlert.java`, `ServiceCalculationType.java`, `EvaluationStatus.java`, `PricingService.java`, `MeteringService.java`, `PricingController.java`, `MeteringController.java`, `PricingDtos.java`, `MeteringDtos.java`, `PricingServiceTest.java`, `MeteringServiceTest.java`.
  - `web/`: `types.ts` (metering), `meteringApi.ts`, `MeteringPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
  - `mobile/`: `types.ts` (metering), `MeteringScreen.tsx`, `HomeScreen.tsx`, `index.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm `PricingServiceTest` và `MeteringServiceTest` (40 tests).
  - `docs/FEATURE_MATRIX.md`, `docs/STATUS.md`.
- **API/migration**: `V004__pricing_and_tariffs.sql` (ràng buộc duy nhất `uq_building_service_month`); `/api/v1/services`, `/api/v1/buildings/{id}/tariffs`, `/api/v1/buildings/{id}/billing-settings`, `/api/v1/contracts/{id}/services`, `/api/v1/contracts/{id}/one-off-charges`, `/api/v1/meters/readings`, `/api/v1/meters/readings/bulk`, `/api/v1/rooms/{id}/meter-readings`, `/api/v1/contracts/{id}/consumption-alerts`, `/api/v1/consumption-alerts/{id}/acknowledge`.
- **Known failures/blockers**: Không có lỗi chức năng; Testcontainers cần Docker daemon, unit tests đạt 40/40 PASS.
- **Exact next action**: Tiến hành Task D2 — Tính tiền, snapshot, hóa đơn nháp, phát hành và điều chỉnh (Billing, Invoices & Adjustments).
- **Git commit**: Sẽ commit ngay sau khi cập nhật docs.

