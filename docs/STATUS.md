# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: INCIDENTS_AND_FEEDBACK_COMPLETE.
- Task vừa thực hiện: F1 — Sự cố bảo trì, upload ảnh, phản hồi hóa đơn (PASS: Migration V008 + CSDL maintenance_issues, issue_status_history, invoice_feedbacks, invoice_feedback_replies, stored_files + Backend OperationsService, IssueController, FeedbackController, FileController, ConflictException 409 + Web IncidentsPage & Tab Phản hồi + Mobile IncidentsScreen + 76/76 Unit Tests đạt 100%).
- Task tiếp theo: F2 — Thông báo và dashboard có đối chiếu (Notifications, Dashboards & Financial Audit - BR-133..BR-137, BR-148..BR-164).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status), `76e97b9` (B2 Auth), `9ac930a` (C1 Property), `d66200a` (C2 Tenancy), `5a83ea5` (D1 Pricing & Metering), `553bfdb` (D2 Invoicing), `85688bd` (E1 Payments), `ccfdaeb` (E2 Deposits), `186bd17` (E3 Checkout).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `Building`, `Floor`, `Room`, `TenantProfile`, `Contract`, `ContractMember`, `RoomMeter`, `MeterReading`, `ServiceDefinition`, `Tariff`, `ContractServiceSubscription`, `BuildingBillingSettings`, `OneOffCharge`, `ConsumptionAlert`, `Invoice`, `InvoiceItem`, `InvoiceAdjustment`, `InvoiceNote`, `FinancialOperation`, `InvoiceLedgerEntry`, `DepositLedgerEntry`, `DepositStatus`, `DepositEntryType`, `MaintenanceIssue`, `IssueStatusHistory`, `InvoiceFeedback`, `InvoiceFeedbackReply`, `StoredFile`, `IssueStatus`, `FeedbackStatus`, `ParentType`.
    - Application/Security: `PropertyService`, `TenancyService`, `AuthService`, `UserService`, `PricingService`, `MeteringService`, `BillingService`, `PaymentService`, `DepositService`, `OperationsService`. Ràng buộc bất biến: `uq_active_room_contract`, `uq_building_service_month` (BR-066), chỉ số mới >= chỉ số cũ (BR-059, EX-07), tìm đơn giá hiệu lực `effectiveMonth <= billingMonth` (BR-067), phân bổ tiền phòng ngày ở `rent * activeDays / totalDaysInMonth` làm tròn HALF_UP đến đồng (EX-01..EX-03), phân bổ dịch vụ người-ngày (EX-05), chặn phát hành khi cảnh báo tiêu thụ chưa giải trình (BR-145), hóa đơn phát hành bất biến (BR-078), điều chỉnh hóa đơn delta có dấu `deltaAmount != 0` và `effectiveDue >= 0` (BR-081, EX-12), kiểm soát trùng lặp qua `financial_operations` (BR-103, EX-25), sổ cái bất biến append-only, sửa thu bù trừ delta `deltaAmount != 0` (BR-093..BR-096, EX-10), hoàn tiền chỉ khi có dư thừa `amount <= credit` (BR-097..BR-100, EX-11), chuyển dư cùng hợp đồng/khách thuê (EX-13, EX-14), sổ cọc append-only, hoàn/khấu trừ `amount <= depositHeld` (EX-15), bù trừ cọc trả nợ hóa đơn nguyên tử (EX-16), quyết toán cọc chỉ khi `ENDED` và `depositHeld == 0` (BR-120), checkout hợp đồng kết thúc membership nguyên tử `leftOn = checkoutDate`, giải phóng phòng `VACANT`, chốt chỉ số bàn giao cuối kỳ `CHECKOUT`, chuyển cọc sang `SETTLING` (BR-043, BR-045, BR-058, BR-119), sự cố bảo trì chỉ tạo khi ACTIVE (BR-125), luồng trạng thái chặt chẽ `OPEN -> ACCEPTED -> IN_PROGRESS -> RESOLVED -> CLOSED` (sai chuyển trả 409 Conflict), mở lại sự cố từ RESOLVED cần lý do (BR-127), phản hồi hóa đơn không tự đổi tiền (BR-123), upload ảnh riêng tư kiểm tra magic numbers thực tế JPEG/PNG/WebP <= 5MB (BR-130, BR-131).
    - API Controllers & DTOs: `PropertyController`, `TenancyController`, `AuthController`, `UserController`, `PricingController`, `MeteringController`, `InvoiceController`, `PaymentController`, `DepositController`, `IssueController`, `FeedbackController`, `FileController`.
    - Migration: `V001__identity.sql`, `V002__property_management.sql`, `V003__tenancy_and_contracts.sql`, `V004__pricing_and_tariffs.sql`, `V005__billing_and_invoices.sql`, `V006__financial_ledgers.sql`, `V007__deposit_ledger.sql`, `V008__operations_and_feedback.sql`.
    - Unit Tests: 76/76 tests PASS (`AuthServiceTest` 7, `PropertyServiceTest` 7, `TenancyServiceTest` 12, `UserServiceTest` 3, `PricingServiceTest` 8, `MeteringServiceTest` 6, `BillingServiceTest` 9, `PaymentServiceTest` 7, `DepositServiceTest` 8, `OperationsServiceTest` 9).
  - Web:
    - UI Components: `BuildingsPage.tsx`, `ContractsPage.tsx` (Tab Hợp đồng + Wizard Checkout trả phòng + Tab Sổ cọc, Thống kê cọc, Dialog Thu/Sửa/Hoàn/Khấu trừ/Bù nợ/Quyết toán cọc), `MeteringPage.tsx`, `InvoicesPage.tsx`, `IncidentsPage.tsx` (Tab Sự cố bảo trì + Modal Báo sự cố kèm upload ảnh + Modal Chi tiết & Tiến trình + Tab Phản hồi thắc mắc hóa đơn), `TenantPortalPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - UI Screens: `PropertyScreen.tsx`, `ContractsScreen.tsx`, `MeteringScreen.tsx`, `InvoicesScreen.tsx`, `IncidentsScreen.tsx` (Card danh sách sự cố, Chip trạng thái, Modal Báo sự cố, Modal Chi tiết & Thao tác chuyển trạng thái, Modal Mở lại có lý do), `HomeScreen.tsx`, `index.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & 76 unit tests PASS 100%.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
- [x] C1 — Khu nhà, tầng, phòng. (PASS: 17 tests, Web build, Mobile typecheck, migration V002)
- [x] C2 — Hồ sơ, hợp đồng, membership, bàn giao. (PASS: 26 tests, Web build, Mobile typecheck, migration V003)
- [x] D1 — Giá, dịch vụ, chỉ số, cảnh báo. (PASS: 40 tests, Web build, Mobile typecheck, migration V004)
- [x] D2 — Tính tiền, snapshot, invoice issue/adjustment. (PASS: 49 tests, Web build, Mobile typecheck, migration V005)
- [x] E1 — Thu tiền, correction, refund, credit transfer. (PASS: 56 tests, Web build, Mobile typecheck, migration V006)
- [x] E2 — Cọc, offset, hoàn/khấu trừ và đối chiếu. (PASS: 64 tests, Web build, Mobile typecheck, migration V007)
- [x] E3 — Checkout và hóa đơn cuối kỳ xuyên suốt. (PASS: 67 tests, Web build, Mobile typecheck)
- [x] F1 — Sửa chữa, ảnh, phản hồi hóa đơn. (PASS: 76 tests, Web build, Mobile typecheck, migration V008)
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
| 2026-10-09 | E2 | `backend` / `.\mvnw.cmd test "-Dtest=DepositServiceTest"` | PASS | 8/8 tests run, 0 failures, 0 errors |
| 2026-10-09 | E2 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11657 modules transformed, dist bundle hoàn tất |
| 2026-10-09 | E2 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-10-09 | E2 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 64 unit tests PASS 100% |
| 2026-10-09 | E3 | `backend` / `.\mvnw.cmd test "-Dtest=TenancyServiceTest"` | PASS | 12/12 tests run, 0 failures, 0 errors |
| 2026-10-09 | E3 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11657 modules transformed, dist bundle hoàn tất |
| 2026-10-09 | E3 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-10-09 | E3 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 67 unit tests PASS 100% |
| 2026-10-09 | F1 | `backend` / `.\mvnw.cmd test "-Dtest=OperationsServiceTest"` | PASS | 9/9 tests run, 0 failures, 0 errors |
| 2026-10-09 | F1 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11659 modules transformed, dist bundle hoàn tất |
| 2026-10-09 | F1 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-10-09 | F1 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 76 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: F1 / PASS (Module Operations: Sự cố bảo trì, lịch sử chuyển trạng thái, xác nhận đóng/mở lại có lý do, trao đổi phản hồi thắc mắc hóa đơn 2 chiều, quản lý tệp đính kèm và kiểm tra magic numbers ảnh private JPEG/PNG/WebP <= 5MB; Web IncidentsPage & Tab Phản hồi; Mobile IncidentsScreen; 76/76 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `V008__operations_and_feedback.sql`, `IssueStatus.java`, `FeedbackStatus.java`, `ParentType.java`, `MaintenanceIssue.java`, `IssueStatusHistory.java`, `InvoiceFeedback.java`, `InvoiceFeedbackReply.java`, `StoredFile.java`, `MaintenanceIssueRepository.java`, `IssueStatusHistoryRepository.java`, `InvoiceFeedbackRepository.java`, `InvoiceFeedbackReplyRepository.java`, `StoredFileRepository.java`, `OperationsDtos.java`, `OperationsService.java`, `ConflictException.java`, `GlobalExceptionHandler.java`, `IssueController.java`, `FeedbackController.java`, `FileController.java`, `OperationsServiceTest.java`.
  - `web/`: `types.ts` (operations), `operationsApi.ts`, `IncidentsPage.tsx`, `AppRouter.tsx`, `AppLayout.tsx`.
  - `mobile/`: `types.ts` (operations), `operationsApi.ts`, `IncidentsScreen.tsx`, `HomeScreen.tsx`, `index.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm `OperationsServiceTest` (76 tests).
  - `docs/FEATURE_MATRIX.md` (OPS-01..OPS-06 -> PASS), `docs/STATUS.md`.
- **API/migration**: `V008__operations_and_feedback.sql`; `/api/v1/issues`, `/api/v1/issues/{id}`, `/api/v1/issues/{id}/status`, `/api/v1/issues/{id}/assign`, `/api/v1/invoices/{id}/feedback`, `/api/v1/feedback/{id}/replies`, `/api/v1/feedback/{id}/status`, `/api/v1/feedback`, `/api/v1/files/upload`, `/api/v1/files/{id}`.
- **Known failures/blockers**: Không có lỗi chức năng; Unit tests đạt 76/76 PASS 100%.
- **Exact next action**: Tiến hành Task F2 — Thông báo và dashboard có đối chiếu (Notifications, Dashboards & Financial Audit - BR-133..BR-137, BR-148..BR-164).

