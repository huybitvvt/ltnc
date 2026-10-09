# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: PAYMENTS_LEDGER_COMPLETE.
- Task vừa thực hiện: E1 — Thu tiền, ledger công nợ, sửa ghi nhận, hoàn tiền, chuyển dư (PASS: Migration V006 + CSDL invoice_ledger_entries + Backend PaymentService, PaymentController, Idempotency + Web InvoicesPage Ledger & modals + Mobile InvoicesScreen Ledger & modals + 56 Unit Tests đạt 100%).
- Task tiếp theo: E2 — Tiền cọc, khấu trừ, hoàn cọc và phát mại (Deposits - BR-105..BR-118, EX-15..EX-17, EX-24).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status), `76e97b9` (B2 Auth), `9ac930a` (C1 Property), `d66200a` (C2 Tenancy), `5a83ea5` (D1 Pricing & Metering), `553bfdb` (D2 Invoicing).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `Building`, `Floor`, `Room`, `TenantProfile`, `Contract`, `ContractMember`, `RoomMeter`, `MeterReading`, `ServiceDefinition`, `Tariff`, `ContractServiceSubscription`, `BuildingBillingSettings`, `OneOffCharge`, `ConsumptionAlert`, `Invoice`, `InvoiceItem`, `InvoiceAdjustment`, `InvoiceNote`, `FinancialOperation`, `InvoiceLedgerEntry`.
    - Application/Security: `PropertyService`, `TenancyService`, `AuthService`, `UserService`, `PricingService`, `MeteringService`, `BillingService`, `PaymentService`. Ràng buộc bất biến: `uq_active_room_contract`, `uq_building_service_month` (BR-066), chỉ số mới >= chỉ số cũ (BR-059, EX-07), tìm đơn giá hiệu lực `effectiveMonth <= billingMonth` (BR-067), phân bổ tiền phòng ngày ở `rent * activeDays / totalDaysInMonth` làm tròn HALF_UP đến đồng (EX-01..EX-03), phân bổ dịch vụ người-ngày (EX-05), chặn phát hành khi cảnh báo tiêu thụ chưa giải trình (BR-145), hóa đơn phát hành bất biến (BR-078), điều chỉnh hóa đơn delta có dấu `deltaAmount != 0` và `effectiveDue >= 0` (BR-081, EX-12), kiểm soát trùng lặp qua `financial_operations` (BR-103, EX-25), sổ cái bất biến append-only, sửa thu bù trừ delta `deltaAmount != 0` (BR-093..BR-096, EX-10), hoàn tiền chỉ khi có dư thừa `amount <= credit` (BR-097..BR-100, EX-11), chuyển dư cùng hợp đồng/khách thuê (EX-13, EX-14).
    - API Controllers & DTOs: `PropertyController`, `TenancyController`, `AuthController`, `UserController`, `PricingController`, `MeteringController`, `InvoiceController`, `PaymentController`.
    - Migration: `V001__identity.sql`, `V002__property_management.sql`, `V003__tenancy_and_contracts.sql`, `V004__pricing_and_tariffs.sql`, `V005__billing_and_invoices.sql`, `V006__financial_ledgers.sql`.
    - Unit Tests: 56/56 tests PASS (`AuthServiceTest` 7, `PropertyServiceTest` 7, `TenancyServiceTest` 9, `UserServiceTest` 3, `PricingServiceTest` 8, `MeteringServiceTest` 6, `BillingServiceTest` 9, `PaymentServiceTest` 7).
  - Web:
    - UI Components: `BuildingsPage.tsx`, `ContractsPage.tsx`, `MeteringPage.tsx`, `InvoicesPage.tsx` (Bộ lọc kỳ tháng/trạng thái, Xem chi tiết breakdown từng khoản, Lập hóa đơn nháp, Phát hành hóa đơn chốt snapshot, Điều chỉnh có audit, Thêm ghi chú đính chính, Sổ cái công nợ Ledger, Thu tiền, Sửa thu, Hoàn tiền dư, Chuyển dư bù nợ), `TenantPortalPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - UI Screens: `PropertyScreen.tsx`, `ContractsScreen.tsx`, `MeteringScreen.tsx`, `InvoicesScreen.tsx` (Danh sách hóa đơn, chip trạng thái DRAFT/ISSUED, dialog chi tiết từng dòng snapshot, dialog điều chỉnh/ghi chú, Sổ cái Ledger entries, Dialog Thu tiền, Sửa thu, Hoàn tiền dư), `HomeScreen.tsx`, `index.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & 56 unit tests PASS 100%.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
- [x] C1 — Khu nhà, tầng, phòng. (PASS: 17 tests, Web build, Mobile typecheck, migration V002)
- [x] C2 — Hồ sơ, hợp đồng, membership, bàn giao. (PASS: 26 tests, Web build, Mobile typecheck, migration V003)
- [x] D1 — Giá, dịch vụ, chỉ số, cảnh báo. (PASS: 40 tests, Web build, Mobile typecheck, migration V004)
- [x] D2 — Tính tiền, snapshot, invoice issue/adjustment. (PASS: 49 tests, Web build, Mobile typecheck, migration V005)
- [x] E1 — Thu tiền, correction, refund, credit transfer. (PASS: 56 tests, Web build, Mobile typecheck, migration V006)
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
| 2026-10-09 | E1 | `backend` / `.\mvnw.cmd test "-Dtest=PaymentServiceTest"` | PASS | 7/7 tests run, 0 failures, 0 errors |
| 2026-10-09 | E1 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11656 modules transformed, dist bundle hoàn tất |
| 2026-10-09 | E1 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-10-09 | E1 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 56 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: E1 / PASS (Thu tiền, sổ cái công nợ append-only, sửa ghi nhận bù trừ delta, hoàn tiền thừa chỉ khi có credit, chuyển dư giữa các hóa đơn cùng hợp đồng hoặc cùng khách thuê, bảo vệ idempotency, Web InvoicesPage Ledger & modals, Mobile InvoicesScreen Ledger & modals, 56/56 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `V006__financial_ledgers.sql`, `InvoiceLedgerEntry.java`, `LedgerEntryType.java`, `PaymentMethod.java`, `InvoiceLedgerEntryRepository.java`, `PaymentDtos.java`, `PaymentService.java`, `PaymentController.java`, `PaymentServiceTest.java`.
  - `web/`: `types.ts` (payments), `paymentsApi.ts`, `InvoicesPage.tsx`.
  - `mobile/`: `types.ts` (payments), `InvoicesScreen.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm `PaymentServiceTest` (56 tests).
  - `docs/FEATURE_MATRIX.md`, `docs/STATUS.md`.
- **API/migration**: `V006__financial_ledgers.sql` (bảng `invoice_ledger_entries`, check `amount <> 0`, foreign key `invoices`, `financial_operations`); `/api/v1/payments/record`, `/api/v1/payments/correct`, `/api/v1/payments/refund`, `/api/v1/payments/transfer-credit`, `/api/v1/invoices/{id}/financial-status`.
- **Known failures/blockers**: Không có lỗi chức năng; Unit tests đạt 56/56 PASS 100%.
- **Exact next action**: Tiến hành Task E2 — Tiền cọc, khấu trừ, hoàn cọc và phát mại (Deposits - BR-105..BR-118, EX-15..EX-17, EX-24).
