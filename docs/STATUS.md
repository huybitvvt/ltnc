# Trạng thái triển khai

Checkpoint: **11/10/2026 — IN_PROGRESS**. Repository public: https://github.com/huybitvvt/ltnc.

## Tiến độ phiên làm việc hiện tại

- Backend: **116 tests, 0 failures/errors/skipped**, gồm 10 test PostgreSQL thực tế: activation đồng thời chỉ 1 hợp đồng ACTIVE, đủ chỉ số bàn giao, checkout lặp trả cùng snapshot; JAR package PASS.
- Web & Mobile typecheck PASS; **9 web tests, 5 mobile tests**, production web build PASS. Đã lưu idempotency key theo actor qua reload/restart, form hóa đơn cuối sau checkout, OWNER-only sửa tòa, và chặn phương thức thu/hoàn cọc ngoài CASH/BANK_TRANSFER.
- Browser E2E: **5/5 PASS** (bao gồm gửi lại thu tiền sau reload và luồng checkout retry + phát hành hóa đơn cuối trước đối chiếu cọc).
- Backup & Restore: `scripts/backup_restore.py` và `docs/BACKUP_RESTORE.md` đã chạy nghiệm thu thực tế thành công qua `.tools/check-backup.py` (kiểm tra dump/restore database, checksum ảnh mã hóa, đối chiếu tổng ledger, từ chối ghi đè database/storage không rỗng, và kiểm thử HTTP sau restore).
- Cấu hình Vercel & Render: đã bổ sung `web/vercel.json`, `render.yaml`, `application-prod.yml` cấu hình Hikari/TLSv1.2 cho Supabase connection pooler (port 6543) và commit `4581e58` đã đẩy lên GitHub master.
- Android APK: tiếp tục hoãn (DEFERRED) theo chỉ đạo của chủ dự án; các kiểm tra code và typecheck/jest của mobile vẫn chạy đầy đủ.

Source backend, web và mobile đã có. [IMPLEMENTATION_REVIEW.md](IMPLEMENTATION_REVIEW.md) ghi kết quả trước đợt sửa này; không dùng unit test hoặc typecheck để kết luận đủ capability trên thiết bị.

## Các phần đã sửa

- Scope theo tòa được phân công, hợp đồng của người đại diện và trạng thái ISSUED cho tài chính, sự cố, phản hồi, file. TENANT không được tự ghi thu tiền.
- Auth tách web/mobile: cookie HttpOnly + CSRF thật trên web, SecureStore trên mobile; reset/activate dùng mã một lần, thu hồi phiên cũ; bootstrap OWNER cần bật rõ ràng và cung cấp mật khẩu.
- Tiền VND dùng chuỗi số nguyên trong API, giới hạn 19 chữ số. Issue đòi kỳ đã đóng, đủ chỉ số tại ranh giới và biểu giá.
- Khóa giao dịch trước kiểm tra số dư; idempotency theo actor/key/hash, lưu snapshot phản hồi. Ledger và snapshot hóa đơn đã phát hành được bảo vệ ở database.
- Báo cáo tách kỳ hóa đơn, khoảng ngày thu tiền và ngày đối chiếu. Audit tài chính, thông báo phát hành/điều chỉnh hóa đơn và thay đổi sự cố.
- Ảnh riêng tư được giải mã, kiểm tra kích thước, mã hóa lại; TEMP upload có hạn dọn dẹp. Web tải ảnh có xác thực; mobile nối camera/thư viện với upload.
- Quản lý STAFF mobile, audit hai client, reset mật khẩu, tests client và CI. Compose gồm PostgreSQL 16, API, web và volume uploads.
- Flyway có **17 migrations**. Java 17, Spring Boot 3.5.16; phiên bản tại [VERSIONS.md](VERSIONS.md).
- Phòng không được gán tầng của tòa khác; STAFF không được tạo tầng. Form tạo/sửa tòa nhà, lưu trữ, tạo tầng, tạo/sửa phòng đã nối API trên hai client.
- Hồ sơ người thuê không mở cho TENANT; STAFF đọc hồ sơ trong phạm vi tòa được giao, hoặc hồ sơ chưa gắn hợp đồng do chính mình tạo. Gỡ phân công có hiệu lực ngay khi request tiếp theo.
- Chuyển dư mới ghi `CREDIT_OUT`/`CREDIT_IN`; lịch sử `CREDIT_APPLIED` giữ nguyên. Expense reference không được vừa thu trên hóa đơn vừa khấu trừ cọc.

## Kiểm tra

Lượt backend hiện tại: **110 tests, 0 failures, 0 errors, 0 skipped**, gồm 8 test tích hợp PostgreSQL và Spring context. Database local là **PostgreSQL 18.4**; không thay bằng chứng PostgreSQL 16. Typecheck hai client, 6 web tests, 2 mobile tests và production build web đã PASS. JAR Spring Boot đã package và chạy trên database riêng, Flyway tạo schema từ rỗng. Browser E2E Edge headless: **4/4 PASS** cho ba role, refresh khi reload, STAFF ngoài scope, TENANT bị chặn thu tiền và gửi lại khoản thu sau mất phản hồi không tạo phiếu trùng. Kết quả tại [evidence](evidence/final-2026-10-11/RESULTS.md).

CI chạy Maven đầy đủ với PostgreSQL 16 qua Testcontainers, typecheck/tests hai client và production build web. Chỉ ghi CI PASS khi job thực sự hoàn tất.

**Android APK/build/cài thiết bị: DEFERRED theo yêu cầu chủ dự án ngày 11/10/2026.** Chưa nghiệm thu camera, SecureStore, lifecycle hoặc chạy khi Metro tắt trên thiết bị. Hermes bundle không phải APK. iOS chưa nghiệm thu.

## Gate còn phải nghiệm thu

- Capability OWNER/STAFF/TENANT hai client: kiểm tra từng thao tác trong FEATURE_MATRIX; còn editor/property/pricing/member/profile và báo cáo cá nhân cần hoàn thiện/kiểm chứng.
- Checkout: bắt buộc đủ chỉ số cuối của phòng; còn preview/final invoice/đối chiếu xuyên suốt và kiểm thử HTTP toàn vòng đời.
- Đối chiếu expenseRef/sourceRef, đầy đủ ngày hiệu lực, thông báo/audit cho mọi mutation.
- OpenAPI đã xuất từ runtime, ERD từ schema 34 bảng; còn seed demo idempotent, backup/restore và chạy từ checkout sạch.
- Browser E2E, parity trên thiết bị và APK chưa nghiệm thu; không gán PASS từ typecheck.

H1/H2/G1 chưa hoàn thành toàn bộ. H2 phần Android được hoãn; các gate còn lại vẫn được xử lý.
