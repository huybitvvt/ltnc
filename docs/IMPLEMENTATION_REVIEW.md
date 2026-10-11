# Đối chiếu tài liệu và implementation TroHub

Ngày kiểm tra: **11/10/2026**. Repository: `E:\ltnc`, HEAD `631e6f2`, bao gồm các thay đổi local có sẵn.

**Kết luận: CHƯA hoàn thành theo bộ hướng dẫn.** Có implementation ở backend/web/mobile, 9 migrations và 97 unit tests đạt; nhưng còn lỗi quyền, nghiệp vụ tài chính, API/client không khớp và thiếu nghiệm thu thực tế. Không đủ căn cứ giữ trạng thái `PROJECT_COMPLETE`, G1/H1/H2 `PASS` trong STATUS.

Phạm vi đối chiếu: kế hoạch chính, GEMINI/START_HERE/README và các tài liệu BACKEND_DESIGN, DECISIONS, DEMO_SCRIPT, DOMAIN_RULES, ERD, FEATURE_MATRIX, FRONTEND_DESIGN, IMPLEMENTATION_TASKS, SOURCES, STATUS, TEST_ACCEPTANCE, VERSIONS; thêm `openapi.yaml`, migrations, controllers/services, client screens/adapters và tests.

## 1. Các kiểm tra đã chạy

| CWD | Lệnh/kiểm tra | Kết quả thực tế |
|---|---|---|
| `backend` | `.\mvnw.cmd test` | **Không đạt**: 98 tests, 0 assertion failures, 1 error; 97 tests Mockito đạt. `TroHubApplicationTests.contextLoads` lỗi do không có Docker environment cho PostgreSQL Testcontainers. Phần PostgreSQL giữ **BLOCKED**, không được tính PASS. |
| `web` | `npm.cmd run build` | **FAIL**, TS6133: `ApiResponse` và `LoginResponseData` không được dùng ở `src/features/auth/AuthContext.tsx:3`. |
| `web` | `npm.cmd run test:run` | **FAIL**, Vitest báo `No test files found`, exit 1. |
| `mobile` | `npm.cmd run typecheck` | **PASS**, exit 0. Chỉ kiểm tra TypeScript. |
| `mobile` | `npm.cmd run test:run -- --runInBand` | **FAIL**, `jest` không tồn tại trong môi trường/dependencies hiện tại. |
| Root | Kiểm tra YAML, đường dẫn trùng | PyYAML đọc được YAML nhưng phát hiện **4 path khai báo lặp**; đọc được YAML không chứng minh OpenAPI hợp lệ hoặc khớp implementation. |
| Root | Đối chiếu tên bảng ERD/migrations | Cùng **33 tên bảng**, không phải 17 bảng như STATUS mô tả. Việc tên bảng khớp không chứng minh cột/ràng buộc đã khớp. |
| Root | Tìm artifacts mobile, kể cả thư mục bị Git ignore | Không có `.apk`/`.aab` dưới `mobile`; có `mobile/dist`, không có native project `mobile/android`. |
| Root | Probe service/serialization | Tái hiện 6 sai lệch ở mục 2, command exit 0. Đây là probe dùng repository mock, không phải kiểm thử HTTP/transaction PostgreSQL. |

Surefire XML và lỗi context hiện có tại `backend/target/surefire-reports/`. [Probe source](evidence/review-2026-10-11/ReviewProbe.java) và [output đã quan sát](evidence/review-2026-10-11/probe-results.txt) được lưu riêng. Chạy lại từ root:

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\evidence\review-2026-10-11\run-probes.ps1
```

Probe tái sử dụng fixture của tests đã compile; khi đổi source cần compile lại trước. Phiên này Maven Wrapper chạy **Java 25.0.3**, Spring Boot thực tế **3.4.3**, không phải runtime Java 17/Boot 3.5 như README ghi.

## 2. Lỗi chặn hoàn thành

### R01 — Phạm vi dữ liệu sự cố, phản hồi và file không được bảo vệ

**Nghiêm trọng, xác định từ code.** [IssueController](../backend/src/main/java/vn/trohub/operations/api/IssueController.java) cho cả OWNER/STAFF/TENANT gọi list/detail/transition nhưng không truyền quyền/scope vào truy vấn đọc. [OperationsService](../backend/src/main/java/vn/trohub/operations/application/OperationsService.java) trả toàn bộ sự cố khi không có filter; tạo/cập nhật không kiểm tra hợp đồng thuộc người gọi, quan hệ phòng–hợp đồng hoặc transition theo vai trò.

[FeedbackController](../backend/src/main/java/vn/trohub/operations/api/FeedbackController.java) và [FileController](../backend/src/main/java/vn/trohub/operations/api/FileController.java) có cùng thiếu sót: đọc phản hồi/file bằng ID không kiểm tra quyền bản ghi cha. Việc require đăng nhập và role TENANT không thay thế quyền trên từng bản ghi. Attach file còn cho thay parent mà không kiểm tra uploader/scope.

Vi phạm BR-013/014/021/026/130/132 và gate F1/H1. Cần kiểm thử trực tiếp các request ngoài tòa/hợp đồng, download file và transition trái vai trò.

### R02 — TENANT có thể tự ghi nhận thu tiền

**Nghiêm trọng, đã tái hiện ở service.** [PaymentController:25](../backend/src/main/java/vn/trohub/billing/api/PaymentController.java) không chặn role cho `/payments/record`. [PaymentService:77](../backend/src/main/java/vn/trohub/billing/application/PaymentService.java) dùng `validateAccess`, hàm cho phép người đại diện TENANT, rồi ghi ledger.

Probe TENANT ghi 3.000.000đ trên hóa đơn của mình được chấp nhận và gọi `ledgerEntryRepository.save`. Người thuê có thể tự khai đã nộp tiền mà không có xác nhận quản lý. Vi phạm BR-022/092/163, B2/E1/H1.

### R03 — STAFF xem được dashboard ngoài phạm vi khi bỏ buildingId

**Nghiêm trọng, đã tái hiện ở service.** [ReportingService:70](../backend/src/main/java/vn/trohub/operations/application/ReportingService.java) chỉ kiểm tra phân công khi `buildingId != null`. Các repository coi null là toàn bộ tòa.

Probe STAFF không được gán tòa vẫn nhận `billedAmount=9876543`, không gọi repository phân công. [Mobile HomeScreen](../mobile/src/features/dashboard/HomeScreen.tsx) gọi `getMetrics()` không truyền tòa, nên đường lỗi này còn được client sử dụng. Vi phạm BR-013 và F2/H1.

### R04 — Cho phát hành hóa đơn khi tháng chưa đóng; thiếu giá được tính 0

**Cao; việc phát hành tháng mở đã tái hiện.** [BillingService:451](../backend/src/main/java/vn/trohub/billing/application/BillingService.java) không so ngày hiện tại với `periodEndExclusive` khi issue. Probe ngày 11/10/2026 phát hành hóa đơn kết thúc 01/11/2026 thành `ISSUED`. Fixture không có meter; không phải bằng chứng đầy đủ cho luồng điện/nước, nhưng chứng minh thiếu điều kiện đóng kỳ trên đường issue.

Trong cùng hàm, không có tariff thì `unitPrice=0` ở dòng 539/576; không chặn phát hành theo BR-067. Cách chọn reading cuối cũng có thể lấy bản ghi muộn hơn ranh giới kỳ vì chỉ đặt cận dưới. Vi phạm BR-051/052/058/063/067, D1/D2.

### R05 — An toàn giao dịch đồng thời và idempotency chưa đạt

**Cao, xác định từ code; race chưa chạy với PostgreSQL.** Refund/transfer/correction trong [PaymentService](../backend/src/main/java/vn/trohub/billing/application/PaymentService.java) đọc số dư rồi append ledger, không khóa invoice; repository không có truy vấn khóa. `@Version` của Invoice không đủ bảo vệ khi thao tác chỉ insert ledger và không cập nhật Invoice. Cần hai transaction thật để kiểm chứng hoàn/bù trừ cạnh tranh.

Khóa idempotency là optional và lookup chỉ theo key toàn cục. Correction/refund/transfer thấy key tồn tại thì trả ngay, không so hash/action; một số phép kiểm tra số dư lại chạy trước lookup replay nên retry sau thành công có thể bị từ chối. HTTP conflict hiện thường là 400 vì dùng `IllegalStateException`/`IllegalArgumentException`, trong khi contract yêu cầu 409.

Client tạo `Date.now()` trong mỗi lần submit tiền, ví dụ [InvoicesPage:301](../web/src/features/invoices/InvoicesPage.tsx), [InvoicesScreen:282](../mobile/src/features/invoices/InvoicesScreen.tsx), [ContractsScreen:249](../mobile/src/features/contracts/ContractsScreen.tsx). Retry sau timeout trở thành key mới, có thể ghi tiền lần hai. Vi phạm BR-103/104/105, I-03/04/05/06 và T-20.

### R06 — Một số ràng buộc tài chính sai đặc tả

**Cao, xác định từ code.** `transferCredit` cho chuyển giữa hai hợp đồng nếu cùng TENANT ở [PaymentService:291](../backend/src/main/java/vn/trohub/billing/application/PaymentService.java), trái BR-100/102 và D-12; số chuyển vượt nợ đích bị tự cắt bằng `min`, thay vì từ chối request sai.

Correction kiểm tra tổng phiếu nguồn nhưng không kiểm tra `netApplied` toàn invoice còn không âm. Thu tiền không có `overpaymentConfirmed` trong DTO và không yêu cầu xác nhận backend theo BR-093. [DepositService](../backend/src/main/java/vn/trohub/billing/application/DepositService.java) không đối chiếu `sourceRef` giữa khấu trừ cọc và one-off charge để chặn thu trùng BR-117.

**Đã tái hiện:** hóa đơn 0đ không có ledger trả `UNPAID` ở [PaymentService:398](../backend/src/main/java/vn/trohub/billing/application/PaymentService.java), trái BR-091/T-19. Endpoint financial-status cũng cho TENANT đọc DRAFT vì chỉ kiểm tra contract access, trái BR-021.

### R07 — API tiền và báo cáo ngày không theo quy ước đã chốt

**Cao; JSON number đã tái hiện.** [BillingDtos](../backend/src/main/java/vn/trohub/billing/api/dto/BillingDtos.java) trả BigDecimal bằng JSON number, không phải string. Probe serialize `9007199254740993` ra number; số này vượt độ chính xác nguyên của JavaScript Number. Các screen còn định dạng bằng `Number`/`parseFloat`.

[InvoiceLedgerEntry](../backend/src/main/java/vn/trohub/billing/domain/InvoiceLedgerEntry.java) và migration V006 không có `effectiveDate`; [InvoiceLedgerEntryRepository](../backend/src/main/java/vn/trohub/billing/infrastructure/InvoiceLedgerEntryRepository.java) lọc dashboard bằng `recordedAt`. Không thể nghiệm thu thu nhập trễ/correction theo ngày tiền thực nhận và báo cáo `asOf` như BR-148…156. Không chỉ là thiếu nhãn UI.

### R08 — Auth web/mobile chưa đúng contract và yêu cầu bảo mật

**Cao, xác định từ code.** [SecurityConfig:40](../backend/src/main/java/vn/trohub/common/security/SecurityConfig.java) tắt CSRF; `/auth/csrf` trả UUID không có cơ chế xác minh. Controller không kiểm tra Origin; login trả refresh token trong JSON cho cả web.

Cookie có path `/api/v1/auth/web`, nhưng [web interceptor:70](../web/src/shared/api/client.ts) refresh qua `/auth/refresh`; browser không gửi cookie tới alias này. [Mobile interceptor:117](../mobile/src/features/auth/mobileClient.ts) cũng gọi `/auth/refresh` với body trong khi handler alias là refresh web đọc cookie; phải dùng `/auth/mobile/refresh`.

Các request đang chờ refresh chỉ có callback resolve; refresh thất bại thì xóa danh sách, không reject các Promise đang chờ. Chưa có phối hợp refresh nhiều tab. Không thấy endpoint/luồng reset mật khẩu hoàn chỉnh. `AuthService.bootstrapOwnerIfNecessary` không giới hạn profile và có password mặc định, trái yêu cầu seed chỉ local/demo. Vi phạm gate B2 và TEST_ACCEPTANCE mục 4.

### R09 — Web quản lý STAFF gọi sai API

**Cao, xác định từ hai đầu code.** [UsersPage:70](../web/src/features/users/UsersPage.tsx) tạo STAFF qua `POST /users/staff`, còn [UserController:61](../backend/src/main/java/vn/trohub/user/api/UserController.java) chỉ có `POST /users`. Bật/tắt dùng `PATCH /users/{id}/status`, server chỉ có `PUT`.

API reissue-invite trả object chứa code nhưng screen coi là string. Chưa có giao diện gán/gỡ tòa trong UsersPage; tạo mới luôn gửi `buildingIds: []`. Không thể ghi USER-01/02 PASS xuyên client.

### R10 — Mobile còn thiếu capability bắt buộc

**Cao, xác định từ route/screen đang có.** [mobile index](../mobile/src/app/index.tsx) và các screen chưa có quản lý STAFF/phân công; [PropertyScreen](../mobile/src/features/property/PropertyScreen.tsx) chỉ đọc tòa, thêm phòng và toggle bookable, không tạo/sửa tòa/tầng hoặc sửa phòng đầy đủ.

[IncidentsScreen](../mobile/src/features/operations/IncidentsScreen.tsx) tạo sự cố chỉ gửi text, không có camera/picker/upload ảnh. Không thấy UI gửi/trả lời phản hồi hóa đơn, chuyển dư hoặc sửa phiếu thu cọc trên mobile; API helper riêng không chứng minh screen có dùng. Dashboard TENANT mới là menu, chưa có tổng quan tài chính cá nhân theo REP-03.

FEATURE_MATRIX đang ghi tất cả các capability này PASS. Gate G1 đòi đủ thao tác thật trên Android cho từng role, không chỉ typecheck/route.

### R11 — Checkout chưa hoàn thành gate E3

**Cao, xác định từ code.** [TenancyService:296](../backend/src/main/java/vn/trohub/tenancy/application/TenancyService.java) kết thúc cư trú/giải phóng phòng nhưng cho phép thiếu `finalReadings`, không bắt buộc đủ điện/nước, không kiểm tra meterId thuộc phòng trong nhánh nhận ID, không tạo/trả kết quả hóa đơn cuối cùng trong command này.

Đã có thao tác hóa đơn/cọc riêng, nhưng chưa đủ quy trình checkout → final invoice → đối chiếu và bằng chứng hai client theo BR-043/E3. Chưa được gọi E3 PASS chỉ vì trạng thái hợp đồng đổi ENDED.

### R12 — Thông báo tự động và audit thiếu phần nối nghiệp vụ

**Cao, xác định từ code.** `NotificationService.sendNotification` hiện chỉ được gọi từ broadcast trong cùng service; issue/adjust invoice và chuyển trạng thái sự cố không gọi nó, không có event listener thay thế. NOTIF-01 chưa hoạt động theo BR-133/136.

Có ledger/contract event/issue history, nhưng chưa có AuditLog/endpoint/query UI theo BACKEND_DESIGN/FRONTEND_DESIGN. Các bảng sổ và `financial_operations` chưa thay thế đầy đủ bộ lọc actor/entity/time và snapshot audit theo BR-161. Gate F2/G1 còn thiếu.

### R13 — OpenAPI và ERD chưa đồng bộ implementation

**Cao, xác định từ đối chiếu.** OpenAPI trùng `/notifications` (1575/1713), `/notifications/{id}/read` (1595/1756), `/notifications/broadcast` (1614/1787), `/reporting/dashboard` (1634/1819). PyYAML mặc định giữ entry cuối, có thể che nội dung cũ.

Ví dụ đường dẫn spec có `/invoices/{id}/payments`, `/contracts/{id}/deposit`, `/rooms`, `/meters/{id}/readings`; server dùng `/payments/record`, `/deposits/contract/{contractId}`, `/buildings/{id}/rooms`, `/meters/readings`. Header `Idempotency-Key` trong spec khác `X-Idempotency-Key` ở implementation. Schema money và cột ledger ERD như `effective_date` cũng chưa khớp. Gate A0/H1 chưa đạt.

## 3. Chứng cứ nghiệm thu và bàn giao còn thiếu

- **97 tests đều dùng Mockito.** `IdempotencyAndConcurrencyIntegrityTest` có 3 test và không chạy hai transaction cạnh tranh. `FinancialLifecycleIntegrityTest` có 4 test; test gắn T-20 thực chất thử một request vượt dư, không phải hai refund đồng thời. Không chứng minh đã phủ mọi EX-01…25/T-01…20/I-01…14.
- **verify.ps1 chọn whitelist 15 lớp**, loại `TroHubApplicationTests`; cũng không chạy web test, mobile test, E2E, native Android build hoặc cài APK. Exit 0 của script không tương đương Definition of Done.
- **Chưa có APK.** HBC export là bundle JavaScript, không phải ứng dụng Android cài được. DEMO_SCRIPT bước 14 hướng dẫn mở `.hbc`, trái TEST_ACCEPTANCE:101 và IMPLEMENTATION_TASKS/H2.
- **Native config thiếu assets:** `mobile/app.json` tham chiếu icon/splash/adaptive-icon/favicon không tồn tại. Chưa chạy native build để xác định toàn bộ lỗi tiếp theo.
- **Không có web/RN tests hoặc E2E evidence** trước phiên review; package web không có `test:e2e`, mobile thiếu Jest/jest-expo/RNTL. Chưa có bằng chứng camera/SecureStore/app lifecycle/ba role trên thiết bị.
- **Không thấy seed fixture demo đầy đủ/idempotent.** Chỉ có OWNER bootstrap; tài khoản STAFF_A/B và TENANT_A/B, tòa/phòng/lịch sử 8/9/10→27 trong README/DEMO_SCRIPT không được tạo từ script seed hiện có.
- **Compose mới có DB**, chưa có API/web/private uploads volume, backup/restore và chứng cứ dựng lại từ checkout sạch theo H2.
- Backend JAR, web/dist và mobile/dist đang tồn tại; chưa rebuild JAR/export mobile hay xác minh checksum của artifacts cũ trong review. Web/dist cũ không thay thế kết quả build source hiện tại.
- Mặc định Boot 3.5 trong DECISIONS/kế hoạch chưa được implementation tuân thủ; pom là 3.4.3. VERSIONS vẫn chứa lựa chọn “hoặc”, chưa là bản ghi phiên bản thực tế nhất quán.

## 4. Đánh giá lại task theo gate

Các nhãn dưới đây là kết quả **review**, không thay cho thực hiện toàn bộ acceptance test:

| Task | Đánh giá | Lý do chính |
|---|---|---|
| A0 | Chưa đạt | Đã có tài liệu nhưng contract/schema/versions chưa đồng bộ. |
| B1 | BLOCKED một phần | Có scaffold/migrations; PostgreSQL Testcontainers không chạy, chưa xác minh Android runtime và DB sạch. |
| B2 | Chưa đạt | R02/R08/R09; reset/session/parity thiếu. |
| C1 | Chưa đạt | Web có implementation; mobile thiếu quản lý tòa/tầng/sửa phòng, phân công chưa có UI hoàn chỉnh. |
| C2 | Có phần đã làm; chưa nghiệm thu | Có profile/contract/member/activate/extend; thiếu quyền/race/luồng chạy thật đủ hai client. |
| D1 | Có phần đã làm; chưa nghiệm thu | Có tariff/meter/alert; sửa chỉ số/ảnh/version và điều kiện issue cần hoàn thiện/kiểm chứng. |
| D2 | Chưa đạt | R04/R05/R07: issue tháng mở, thiếu giá, JSON money/contract. |
| E1 | Chưa đạt | R02/R05/R06: quyền thu, retry/race/correction/transfer. |
| E2 | Chưa đạt | Có sổ cọc/offset/settle; chưa chứng minh race/rollback/sourceRef và thiếu mobile sửa thu cọc. |
| E3 | Chưa đạt | R11: final readings/final invoice và demo toàn vòng đời thiếu. |
| F1 | Chưa đạt | R01/R10: scope sự cố/file/feedback, ảnh và feedback mobile. |
| F2 | Chưa đạt | R03/R07/R12: scope dashboard, ngày tiền, thông báo tự động/audit. |
| G1 | Chưa đạt | Capability parity còn thiếu, không có kiểm chứng từng role × platform. |
| H1 | BLOCKED và thiếu tests | 97 unit tests đạt nhưng context fail do Docker, không có DB concurrency/OpenAPI/E2E kiểm chứng đầy đủ. |
| H2 | Chưa đạt | Không APK, không chạy khi Metro tắt, thiếu seed/Compose/bàn giao sạch. |

## 5. Thứ tự xử lý đề xuất

1. Sửa quyền bản ghi và file, quyền ghi thu tiền, scope dashboard; bổ sung request-level tests cho cả ba vai trò.
2. Sửa điều kiện issue, tiền dạng string, ledger ngày hiệu lực, idempotency và khóa giao dịch; kiểm thử PostgreSQL thật gồm race/rollback.
3. Đồng bộ OpenAPI/ERD/DTO/client; sửa các endpoint STAFF và auth/refresh/reset.
4. Hoàn thiện các capability web/mobile còn thiếu, seed demo thật và thông báo/audit.
5. Chạy đầy đủ tests/E2E, build/cài APK và tắt Metro, dựng sạch; chỉ cập nhật PASS khi có chứng cứ.

Phiên review thêm báo cáo và probe evidence. Các sửa đổi source/config có sẵn của người dùng được giữ nguyên. Không có test PostgreSQL/HTTP/E2E/native Android nào được gọi PASS trong báo cáo này.
