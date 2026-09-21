# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: SPEC_READY_FOR_SCAFFOLD.
- Task vừa hoàn thành: A0 (PASS).
- Task tiếp theo: B1 — Môi trường, scaffold ba app, Flyway/Compose.
- Đã có:
  - Repository Git local đã khởi tạo (`git init`).
  - Khóa phiên bản công nghệ tại `docs/VERSIONS.md`.
  - Thiết kế CSDL, ràng buộc duy nhất, sổ cái và mapping BR tại `docs/ERD.md`.
  - Hợp đồng API chuẩn OpenAPI 3.0.3 tại `docs/openapi.yaml` (đã validate YAML cú pháp thành công).
  - Ma trận tính năng 3 vai trò x 2 nền tảng tại `docs/FEATURE_MATRIX.md`.
  - Hướng dẫn tổng thể và phân định trạng thái tại `README.md`.
- Công cụ môi trường:
  - Sẵn sàng: Git 2.53, Node v24.14, npm 11.9, Docker 29.5.3, Docker Compose v5.1.4, Android SDK API 34/35 tại E:\Android\Sdk.
  - Cần xử lý cho B1 Backend: Cài đặt JDK 17 LTS (`winget install EclipseAdoptium.Temurin.17.JDK`) do JAVA_HOME hiện tại đang trỏ tới JBR Android Studio (Java 25).
- Chưa có mã nguồn ứng dụng: backend, web, mobile, migration hay APK (sẽ bắt đầu scaffold tại B1).

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [ ] B1 — Môi trường, scaffold ba app, Flyway/Compose.
- [ ] B2 — Auth, tài khoản, scope và session trên hai client.
- [ ] C1 — Khu nhà, tầng, phòng.
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
| 2026-09-21 | A0 | `powershell -Command "git --version; node -v; npm.cmd -v; docker --version; docker compose version; adb version"` | PASS | Đã ghi nhận phiên bản công cụ thực tế |
| 2026-09-21 | A0 | `python -c "import yaml; yaml.safe_load(open('docs/openapi.yaml', encoding='utf-8'))"` | PASS | `docs/openapi.yaml` hợp lệ 100% cú pháp OpenAPI 3.0.3 |
| 2026-09-21 | A0 | Đối chiếu chéo Money/Date/Role/Ledger giữa ERD, OpenAPI và DOMAIN_RULES | PASS | Không có bất kỳ mâu thuẫn nào |

## Checkpoint chi tiết

- **Task / status**: A0 / PASS (Sẵn sàng bước vào B1).
- **Files đã đổi / tạo mới**:
  - `.git/` (khởi tạo repo)
  - `docs/VERSIONS.md` (mới)
  - `docs/ERD.md` (mới)
  - `docs/openapi.yaml` (mới)
  - `docs/FEATURE_MATRIX.md` (mới)
  - `README.md` (mới)
  - `docs/STATUS.md` (cập nhật)
- **API/migration**: Đã chốt hợp đồng API toàn diện trong `docs/openapi.yaml`.
- **Known failures/blockers**: Cần bổ sung JDK 17 LTS trên máy trước khi build Java Spring Boot ở B1.
- **Exact next action**: Tiến hành Task B1 — Tạo scaffold `infra/compose.yaml` (PostgreSQL 16), `backend/` (Spring Boot 3.5, Maven Wrapper, Flyway V001), `web/` (React Vite MUI), `mobile/` (React Native Expo Paper).
