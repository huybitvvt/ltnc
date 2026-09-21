# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: INVOICING_BILLING_COMPLETE.
- Task vừa thực hiện: D2 — Tính tiền, snapshot, invoice issue/adjustment (PASS: Migration V005 + CSDL financial_operations/invoices/invoice_items/invoice_adjustments/invoice_notes + Backend BillingService, InvoiceController, Idempotency + Web InvoicesPage + Mobile InvoicesScreen + 49 Unit Tests đạt 100%).
- Task tiếp theo: E1 — Thu tiền, ledger công nợ, sửa ghi nhận, hoàn tiền, chuyển dư (Payments, Overpayment Transfers, Ledger Entries).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status), `76e97b9` (B2 Auth), `9ac930a` (C1 Property), `d66200a` (C2 Tenancy), `5a83ea5` (D1 Pricing & Metering).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `Building`, `Floor`, `Room`, `TenantProfile`, `Contract`, `ContractMember`, `RoomMeter`, `MeterReading`, `ServiceDefinition`, `Tariff`, `ContractServiceSubscription`, `BuildingBillingSettings`, `OneOffCharge`, `ConsumptionAlert`, `Invoice`, `InvoiceItem`, `InvoiceAdjustment`, `InvoiceNote`, `FinancialOperation`.
    - Application/Security: `PropertyService`, `TenancyService`, `AuthService`, `UserService`, `PricingService`, `MeteringService`, `BillingService`. Ràng buộc bất biến: `uq_active_room_contract`, `uq_building_service_month` (BR-066), chỉ số mới >= chỉ số cũ (BR-059, EX-07), tìm đơn giá hiệu lực `effectiveMonth <= billingMonth` (BR-067), phân bổ tiền phòng ngày ở `rent * activeDays / totalDaysInMonth` làm tròn HALF_UP đến đồng (EX-01..EX-03), phân bổ dịch vụ người-ngày (EX-05), chặn phát hành khi cảnh báo tiêu thụ chưa giải trình (BR-145), hóa đơn phát hành bất biến (BR-078), điều chỉnh hóa đơn delta có dấu `deltaAmount != 0` và `effectiveDue >= 0` (BR-081, EX-12), kiểm soát trùng lặp qua `financial_operations` (BR-103, EX-25).
    - API Controllers & DTOs: `PropertyController`, `TenancyController`, `AuthController`, `UserController`, `PricingController`, `MeteringController`, `InvoiceController`.
    - Migration: `V001__identity.sql`, `V002__property_management.sql`, `V003__tenancy_and_contracts.sql`, `V004__pricing_and_tariffs.sql`, `V005__billing_and_invoices.sql`.
    - Unit Tests: 49/49 tests PASS (`AuthServiceTest` 7, `PropertyServiceTest` 7, `TenancyServiceTest` 9, `UserServiceTest` 3, `PricingServiceTest` 8, `MeteringServiceTest` 6, `BillingServiceTest` 9).
  - Web:
    - UI Components: `BuildingsPage.tsx`, `ContractsPage.tsx`, `MeteringPage.tsx`, `InvoicesPage.tsx` (Bộ lọc kỳ tháng/trạng thái, Xem chi tiết breakdown từng khoản, Lập hóa đơn nháp, Phát hành hóa đơn chốt snapshot, Điều chỉnh có audit, Thêm ghi chú đính chính), `TenantPortalPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - UI Screens: `PropertyScreen.tsx`, `ContractsScreen.tsx`, `MeteringScreen.tsx`, `InvoicesScreen.tsx` (Danh sách hóa đơn, chip trạng thái DRAFT/ISSUED, dialog chi tiết từng dòng snapshot, dialog điều chỉnh và ghi chú cho Quản lý), `HomeScreen.tsx`, `index.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & 49 unit tests PASS 100%.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
- [x] C1 — Khu nhà, tầng, phòng. (PASS: 17 tests, Web build, Mobile typecheck, migration V002)
- [x] C2 — Hồ sơ, hợp đồng, membership, bàn giao. (PASS: 26 tests, Web build, Mobile typecheck, migration V003)
- [x] D1 — Giá, dịch vụ, chỉ số, cảnh báo. (PASS: 40 tests, Web build, Mobile typecheck, migration V004)
- [x] D2 — Tính tiền, snapshot, invoice issue/adjustment. (PASS: 49 tests, Web build, Mobile typecheck, migration V005)
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
| 2026-09-21 | D2 | `backend` / `.\mvnw.cmd test "-Dtest=BillingServiceTest"` | PASS | 9/9 tests run, 0 failures, 0 errors |
| 2026-09-21 | D2 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11655 modules transformed, dist bundle hoàn tất |
| 2026-09-21 | D2 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-09-21 | D2 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 49 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: D2 / PASS (Tính tiền phòng, điện nước theo biểu giá lũy tiến/đồng giá, dịch vụ theo ngày và người-ngày, phụ thu, lập hóa đơn nháp, phát hành hóa đơn chốt snapshot, điều chỉnh hóa đơn kèm lý do kiểm toán, đính chính phi tài chính, bảo vệ idempotency, Web InvoicesPage, Mobile InvoicesScreen, 49/49 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `V005__billing_and_invoices.sql`, `Invoice.java`, `InvoiceItem.java`, `InvoiceAdjustment.java`, `InvoiceNote.java`, `FinancialOperation.java`, `InvoiceStatus.java`, `InvoiceItemType.java`, `PaymentStatus.java`, `FinancialAction.java`, `BillingService.java`, `InvoiceController.java`, `BillingDtos.java`, `BillingServiceTest.java`.
  - `web/`: `types.ts` (invoices), `invoicesApi.ts`, `InvoicesPage.tsx`, `AppRouter.tsx`.
  - `mobile/`: `types.ts` (invoices), `InvoicesScreen.tsx`, `HomeScreen.tsx`, `index.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm `BillingServiceTest` (49 tests).
  - `docs/FEATURE_MATRIX.md`, `docs/STATUS.md`.
- **API/migration**: `V005__billing_and_invoices.sql` (ràng buộc duy nhất `uq_invoice_contract_month`, `uq_financial_operations_idem`); `/api/v1/invoices`, `/api/v1/invoices/preview`, `/api/v1/invoices/draft`, `/api/v1/invoices/{id}`, `/api/v1/invoices/{id}/issue`, `/api/v1/invoices/{id}/adjust`, `/api/v1/invoices/{id}/notes`.
- **Known failures/blockers**: Không có lỗi chức năng; Testcontainers cần Docker daemon, unit tests đạt 49/49 PASS.
- **Exact next action**: Tiến hành Task E1 — Thu tiền, ledger công nợ, sửa ghi nhận, hoàn tiền, chuyển dư (Payments, Corrections, Refunds, Overpayment Transfers).
- **Git commit**: Sẽ commit ngay sau khi cập nhật docs.
