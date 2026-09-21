# Danh sách task thực hiện đến khi hoàn thành

## 1. Quy trình áp dụng cho mọi task

- Đọc STATUS, git diff và spec liên quan; không làm lại phần đã có.
- Bắt đầu bằng mục tiêu và tiêu chí đạt; cập nhật API/ERD nếu cần trước code.
- Implement migration → repository/service → controller → test → web → mobile.
- Có thể dùng mock khi dựng form, nhưng gate của task phải chạy API thật.
- Chạy kiểm tra đúng phần thay đổi; sửa lỗi rồi cập nhật STATUS/FEATURE_MATRIX.
- Tự chuyển task tiếp theo sau gate pass. Các task có phụ thuộc chưa pass không được gọi DONE.
- Nếu thiếu môi trường ở một bước, ghi BLOCKED và tiếp tục phần độc lập; giữ bước đó chưa nghiệm thu.
- Không chia theo số người/số tuần. Mỗi task có thể cần nhiều phiên.
- Không sinh sẵn hàng loạt class hoặc UI chưa hoạt động để báo phần trăm tiến độ.

Trong docs/FEATURE_MATRIX.md, mỗi hàng là use case + role; cột API/Web/Mobile/Test/Evidence
dùng NOT_STARTED, IN_PROGRESS, PASS, FAIL, BLOCKED. Không đánh dấu PASS chỉ vì có route.

## 2. Hàng đợi theo phụ thuộc

### A0 — Chốt thiết kế thực thi và môi trường đích

**Phụ thuộc:** bộ tài liệu hiện tại.

**Làm:**
1. Kiểm tra file/công cụ thực tế, đọc các mặc định D-01…D-22; không yêu cầu user chốt lại tất cả.
2. Tạo docs/VERSIONS.md: JDK, Boot patch, Maven Wrapper, Node/npm, Expo/React/RN và Android SDK.
3. Tạo docs/ERD.md có bảng, FK, uniqueness, ledger và trạng thái; ghi rule BR tương ứng.
4. Tạo docs/openapi.yaml bản 3.0.3 với DTO chuẩn, lỗi, auth nền; thêm endpoint theo task sau.
5. Tạo docs/FEATURE_MATRIX.md có đủ capability × role × hai nền tảng.
6. Tạo README ban đầu phân biệt “sẽ triển khai” và “đã chạy”.

**Gate:** không mâu thuẫn money/date/role/ledger giữa ERD, OpenAPI và DOMAIN_RULES.
Mọi task sau có thể bắt đầu không cần đoán framework hoặc quy tắc tiền. Validate YAML/OpenAPI.
**Checkpoint:** ghi công cụ còn thiếu, cách khắc phục cụ thể; chưa đánh dấu phần mềm chạy.

### B1 — Scaffold backend, web, mobile và DB

**Phụ thuộc:** A0.

**BE/infra:** Maven Wrapper, Java17 Boot3.5; PostgreSQL Compose healthcheck+volume;
Flyway migrations tối thiểu; profiles local/test; Hibernate validate; response/errors;
Clock injectable; /actuator/health chỉ liveness, không lộ cấu hình.

**Web:** Vite ReactTS, MUI theme/layout, router, QueryClient, HTTP/error adapter,
.env.example; có trang trạng thái kết nối API dùng health hoặc endpoint public phù hợp.

**Mobile:** ExpoTS/Router/Paper, QueryClient, native config, .env.example;
chạy app trên Android và gọi API host đúng địa chỉ. Dựng providers ngoài thư mục routes.

**Gate:** từ DB rỗng Flyway chạy được, web/mobile gọi backend thật.
Tạo lockfiles, scripts lint/typecheck/test/build. Lưu command và ảnh kết nối thành công.
Nếu Android SDK chưa có: web/BE vẫn triển khai, mobile runtime giữ BLOCKED.

### B2 — Tài khoản, session, phân quyền và audit nền

**Phụ thuộc:** B1.

**BE:** User, AuthSession, InviteToken, BuildingStaffAssignment; bootstrapping OWNER
từ env cho profile local; BCrypt, JWT, refresh rotation, revocation; mời/reset một lần;
web HttpOnly cookie+CSRF/Origin; mobile SecureStore transport; disable user/đổi mật khẩu
thu hồi phiên phù hợp; scope thực thi mỗi request.

**Clients:** login/activate/reset/change password/me/logout, session restore, route guards,
single-flight refresh, xóa cache khi đổi tài khoản; OWNER tạo/khóa STAFF, cấp mã mời.

**Tests:** sai password, expired invitation, reuse refresh, session revoked, 401/403,
STAFF không gán quyền cho mình, TENANT không gọi quản trị, stale cache logout.
**Gate:** cả ba role đăng nhập trên hai nền tảng; chưa có building thật có thể seed test scope.
**Docs:** auth contract + demo credentials lấy env, không in password thật trong logs.

### C1 — Khu nhà, tầng, phòng và phân công phạm vi

**Phụ thuộc:** B2.

**BE:** OWNER CRUD/archive building/floor; STAFF đọc trong scope và quản lý room;
gán/gỡ scope cho STAFF; ràng buộc room code theo building, capacity, floor parent;
archive không phá lịch sử; rentability và occupancy riêng.

**Clients:** list/search/filter/page/detail/create/edit, room state badge;
owner assignment; STAFF chỉ chọn tòa được giao; TENANT chưa gắn hợp đồng thấy empty state.

**Tests:** đổi IDs ngoài scope; room/floor sai building; mã trùng; sức chứa<=0;
bị gỡ scope có hiệu lực ngay cả access token chưa hết hạn.
**Gate:** OWNER tạo từ mobile và thấy trên web; STAFF đúng scope làm được và sai scope bị chặn.

### C2 — Người thuê, thành viên, hợp đồng, nhận phòng và gia hạn

**Phụ thuộc:** C1.

**BE:** tenant profile, contract draft, membership date range; đại diện gắn tài khoản;
triển khai RoomMeter và MeterReading bàn giao tối thiểu tại đây để activate không phụ thuộc D1;
activate có chỉ số bàn giao điện/nước và snapshot giá; room lock+unique ACTIVE;
extend audit giữ giá; hợp đồng quá hạn vẫn ACTIVE; endpoint checkout có thiết kế
nhưng chỉ hoàn tất xuyên tài chính ở E3.

**Clients:** contract list/detail/create/edit draft, member editor, activation wizard,
invitation flow, extension form; TENANT xem hợp đồng active/cũ, người ở và cọc cần đóng.

**Tests:** hai activation đồng thời; min1day; capacity theo thời điểm chồng membership;
người đại diện không có account hợp lệ; draft không khóa phòng; tenant không đọc hợp đồng khác.
**Gate:** nhận phòng thật trên hai client; lịch sử không biến mất khi đổi room price.
**Lưu ý:** không báo checkout hoàn tất ở đây khi các task tiền chưa có.

### D1 — Giá, dịch vụ, công tơ, chỉ số và cảnh báo

**Phụ thuộc:** C2.

**BE:** service definitions/subscriptions phiên bản kỳ; tariffs effectiveMonth; meter boundary
readings và attachment; sửa nháp có version; chỉ số referenced trong invoice đã phát hành bất biến;
cảnh báo BR-138…147, acknowledgement gắn đúng version.

**Clients:** chọn kỳ/phòng, nhập chỉ số/ảnh, tạo giá kỳ sau, kiểm tra cảnh báo;
hiển thị INSUFFICIENT_DATA/NOT_COMPARABLE; sửa số liệu làm mất hiệu lực acknowledgement.

**Tests:** không giá, giá cùng kỳ trùng, chỉ số giảm/thiếu, snapshot/reference;
8/9/10→27 cảnh báo, partial kỳ bị skip, ảnh sai scope.
**Gate:** tenant chỉ đọc điện nước liên quan qua quyền; manager có thể sửa trước phát hành.
**File:** storage private và kiểm tra file có thể dùng lại ở F1, không public uploads folder.

### D2 — Hóa đơn nháp, tính tiền, phát hành và điều chỉnh

**Phụ thuộc:** D1.

**BE:** triển khai FinancialOperation/idempotency chung tại đây (E1 dùng lại), rồi
fee strategies, person-days, prorated rent; preview breakdown;
draft/recalculate; issue chỉ closed interval; immutable snapshot; unique contract/month;
InvoiceAdjustment có delta/reason/audit, effectiveDue>=0; chưa thu tiền thì totals vẫn đúng.

**Clients:** manager preview+issue+adjust; tenant chỉ thấy ISSUED;
explanation từng dòng, ảnh meter, giá gốc/điều chỉnh/tổng hiệu lực, dueDate.

**Tests:** EX-01…07, EX-12, EX-21, EX-23; tháng nhuận, đi qua tháng,
sửa giá niêm yết/tariff không đổi issued; two requests same key; rollback không để invoice rỗng.
**Gate:** một hóa đơn phát hành hiện đồng nhất trên web/mobile; before-close issue bị từ chối.
**Docs:** thêm request/response mẫu đã chạy, tính tiền từ BE không có công thức thẩm quyền FE.

### E1 — Thu tiền, sửa ghi nhận, hoàn tiền và chuyển dư

**Phụ thuộc:** D2.

**BE:** InvoiceLedgerEntry, dùng lại FinancialOperation/idempotency từ D2; signed entries;
PAYMENT, PAYMENT_CORRECTION source, REFUND, paired CREDIT_OUT/CREDIT_IN;
derived UNPAID/PARTIAL/PAID/CREDIT; locks canonical, no negative netApplied;
overpay flag; same-contract transfer limited source credit/target debt.

**Clients:** payment list/detail/add, correction dialog, refund dialog, credit transfer;
idempotency key giữ nguyên khi timeout/retry, không optimistic money update.

**Tests:** EX-08…14, EX-18, EX-25; correction không thành refund, double refund race,
different payload samekey409, không gửi lại key mới khi response mất, tenant forbidden.
**Gate:** giảm invoice đã trả đủ hiện tiền dư; refund thật giảm dư; payment ledger chỉ append.
**Không làm:** ví tài khoản tổng quát hoặc gateway ngân hàng.

### E2 — Sổ cọc và quyết toán

**Phụ thuộc:** E1.

**BE:** DepositLedgerEntry và state; receipt/correction/refund/deduction/offset;
offset một FinancialOperation ghi đồng thời deposit + invoice;
source liên kết chi phí tránh vừa khấu trừ vừa tính lại invoice;
settle chỉ held=0, điều kiện trạng thái theo DOMAIN_RULES.

**Clients:** cọc phải đóng/đã nhận/đang giữ, nhận từng phần, correction, khấu trừ,
hoàn, chọn invoice để bù, xác nhận quyết toán, lịch sử cho tenant.

**Tests:** dùng fixture hợp đồng ENDED để thử settlement trước khi E3 hoàn thiện checkout;
EX-15…17; tổng hai hoàn cạnh tranh không vượt held;
lỗi ghi invoice phải rollback deposit; spent receipt correction invalid bị chặn.
**Gate:** cọc không cộng cash-in invoice; ended contract còn held vẫn được hiển thị.

### E3 — Trả phòng, hóa đơn cuối và đối chiếu toàn luồng

**Phụ thuộc:** E2.

**BE:** checkout actual date + final readings + membership end + room release nguyên tử.
Không buộc công nợ=0 để kết thúc cư trú. Kỳ cuối dùng invoice unique đã có draft hoặc tạo
mới rồi phát hành theo D2; bước settle tài chính riêng, không một nút giả “xong hết”.
Không edit lại kỳ đã issued; charge thiếu dùng adjustment có audit.

**Clients:** checkout wizard: kiểm tra ngày/chỉ số → kết thúc cư trú → hóa đơn cuối
→ debt/credit/cọc → thao tác settlement được phép. Mỗi bước hiển thị trạng thái thật.

**Tests:** ở từ20/09→10/10; end-exclusive; room release kể cả chưa hoàn cọc;
không tạo hai invoice cuối tháng; tenant mới không xem lịch sử cũ và ngược lại.
**Gate:** chạy từ receive-room đến settled bằng cả web/mobile, số dư đối chiếu được.

### F1 — Sự cố, ảnh và phản hồi hóa đơn

**Phụ thuộc:** D2; có thể làm sau E3 theo thứ tự mặc định.

**BE:** maintenance request/history/assignment, invoice feedback/replies,
attachment private; chuyển state theo rule; tenant chỉ tạo incident khi active;
feedback không tự đổi tiền; audit và notification event.

**Clients:** issue/feedback list/detail/create, image pick/camera/preview,
manager assign/progress/resolve, tenant confirm/reopen; hóa đơn link feedback.

**Tests:** quyền tải ảnh, MIME thật/size/count, không ảnh vẫn hợp lệ nếu rule cho phép,
feedback invoice ngoài quyền, contract ended không tạo incident mới,
transition không hợp lệ trả409, failed upload không mất form.
**Gate:** tenant báo bằng app, STAFF xử lý trên web, tenant xác nhận bằng web/app.

### F2 — Thông báo và dashboard có đối chiếu

**Phụ thuộc:** E3,F1.

**BE:** notification recipient snapshot, read/unread, dedupe event/recipient;
invoice issue/adjustment and incident/feedback events;
dashboard scope + billingMonth + cash dates + asOf; held không phụ thuộc contract ACTIVE.
Audit query có mask; quản lý tạo thông báo thủ công đơn giản cho người đại diện hợp đồng
ACTIVE trong phạm vi theo OpenAPI/FEATURE_MATRIX, không gửi kênh ngoài.

**Clients:** inbox badge/list/open/mark read; dashboard vai trò phù hợp;
lọc rõ ba loại thời gian; xem drill-down dữ liệu nguồn thay vì card giả.

**Tests:** EX-17…20, late payment prior invoice, refunds separate,
cash không tăng bởi deposit offset/credit transfer; notification old tenant không thấy data mới;
mutation rollback không phát notification thành công.
**Gate:** totals khớp fixture/sổ; 0 dữ liệu là empty state, không số giả.

### G1 — Kiểm tra đầy đủ capability và UX cả hai client

**Phụ thuộc:** B2…F2.

**Làm:** rà FEATURE_MATRIX từng role×usecase; hoàn thiện lỗi rỗng/quyền/session/offline,
web responsive/table/filter, mobile cards/keyboard/back, form confirmations,
focus refetch và query invalidation, private images/cache lifecycle.
Bổ sung endpoint cần cho màn hình thật; không tạo nghiệp vụ thứ hai cho mobile.

**Tests:** Playwright3roles; RN component behavior; thao tác quản trị đầy đủ trên Android;
TalkBack/keyboard labels, font lớn, permission denied camera, timeout tài chính.
**Gate:** 100% capability bắt buộc có API/Web/Mobile và bằng chứng.
Không dùng trạng thái DONE của frontend để che runtime app chưa chạy.

### H1 — Kiểm thử tích hợp, quyền và tính toàn vẹn

**Phụ thuộc:** G1.

**Làm:** chạy toàn bộ tests trong TEST_ACCEPTANCE; contract/OpenAPI check;
thử service restart+DB persistence; race invoice/activate/refund/offset; auth session
revocation+refresh; query pagination scope; fix lỗi và chạy lại bộ liên quan.

**Gate:** required tests pass với PostgreSQL; không fallback H2 cho đặc tính khóa/constraint;
các tình huống audit/số tiền đối chiếu được. Chưa có SDK hoặc Docker giữ BLOCKED rõ.

### H2 — Đóng gói, hướng dẫn chạy và demo

**Phụ thuộc:** H1 và bằng chứng mobile runtime.

**Làm:**
1. JAR/Docker backend; web production build và route fallback.
2. Build APK Android có bundle độc lập, cài và chạy với Metro tắt; log build+SHA256.
3. Compose DB/API/web, persistent uploads volume, .env.example, healthchecks.
4. Seed idempotent ở demo profile; không chèn tài khoản mặc định vào production.
5. README PowerShell commands, addresses, dev vs demo, reset test data có chủ đích.
6. docs/DEMO_SCRIPT.md, test report, version list, limitations, backup/restore DB+files.
7. Thử dựng từ checkout sạch trong thư mục/môi trường test riêng, không xóa dữ liệu đang dùng.

**Gate:** Definition of Done đạt, có artifacts thực tồn tại, demo lặp được.
Không yêu cầu deploy trả phí/publish app store để hoàn thành.

## 3. Hợp đồng scripts và lệnh kiểm tra

Đây là **lệnh đích phải được tạo/kiểm chứng trong implementation**, chưa chạy được chỉ với gói tài liệu.

| CWD | Lệnh PowerShell | Dùng khi |
|---|---|---|
| root | docker compose -f infra/compose.yaml up -d db | Local DB (đọc env theo README) |
| backend | .\mvnw.cmd test | Unit test thường xuyên |
| backend | .\mvnw.cmd verify | Unit+integration (Failsafe cấu hình tên *IT) |
| backend | .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local" | Chạy API dev |
| web | npm.cmd ci | Cài đúng lock |
| web | npm.cmd run dev | Vite dev |
| web | npm.cmd run lint / typecheck / test:run / build | Chạy từng lệnh riêng |
| web | npm.cmd run test:e2e | Playwright cần backend/test seed thật |
| mobile | npm.cmd ci | Cài đúng lock |
| mobile | npx.cmd expo start | Dev Metro |
| mobile | npx.cmd expo-doctor | Tương thích dependency/config |
| mobile | npm.cmd run lint / typecheck / test:run | Chạy từng lệnh riêng |
| mobile | npx.cmd expo run:android | Development build khi có SDK |
| root | .\scripts\verify.ps1 | Tổng hợp exit codes, không giấu fail |

Script root phải hiển thị rõ step skip và exit khác0 cho required step fail.
Không gọi export JS bundle là APK build. Android release cần native toolchain, bundling
và signing cấu hình theo bản SDK đã chọn; mật khẩu signing nằm ngoài repo.
Mỗi script có help/README và không reset database mặc định.

## 4. Mẫu checkpoint sau task

```text
Task: E1
Status: IN_PROGRESS
Completed: API receipt/correction; web form; mobile form.
Remaining: concurrent refund test, device timeout retry.
Changed: ...
Migration/OpenAPI: ...
Commands run: cwd + command + exit/result.
Evidence: docs/evidence/...
Blockers: ...
Next exact action: ...
```

Nếu đang làm nhiều task độc lập, ghi từng task riêng. Không tăng trạng thái DONE khi
chỉ có skeleton, typecheck hoặc màn hình đã dựng.
