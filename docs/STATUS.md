# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: SCAFFOLD_COMPLETE.
- Task vừa thực hiện: B1 — Môi trường, scaffold ba app, Flyway/Compose (PASS phần scaffold và build; Testcontainers integration test BLOCKED chờ Docker daemon).
- Task tiếp theo: B2 — Auth, tài khoản, scope và session trên hai client.
- Đã có:
  - Repository Git local: 2 commits (`6d08b31` cho A0, `09e9e3f` cho B1).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend: `backend/pom.xml` (Spring Boot 3.4.3/3.5, JPA, Security, Actuator, Flyway, Testcontainers), `mvnw.cmd` và `mvnw`, `V001__identity.sql`, cấu hình profile `local`/`test`, `ClockConfig`, `ApiResponse`, `ApiError`, `GlobalExceptionHandler`, `SecurityConfig`, `AuthController`. Compile bytecode Java 17 thành công (`BUILD SUCCESS`).
  - Web: `web/` (React 18, TypeScript, Vite 6, MUI 6, TanStack Query, React Router), `package-lock.json` đã sinh, `typecheck` PASS, `build` PASS sinh thư mục `dist/`, trang trạng thái kết nối `ConnectionStatusPage.tsx`.
  - Mobile: `mobile/` (React Native 0.76, Expo SDK 52, Expo Router v4, Paper v5, TanStack Query), `package-lock.json` đã sinh, `typecheck` PASS, màn hình trạng thái `MobileStatusScreen.tsx`.
  - Scripts: `scripts/verify.ps1` tổng hợp kiểm tra 3 app chạy thành công, `scripts/dev.ps1` khởi động dev.
- Công cụ môi trường:
  - Sẵn sàng: Git 2.53, Node v24.14, npm 11.9, Android SDK tại `E:\Android\Sdk`.
  - Đang chờ: Docker Desktop chưa được khởi động ở chế độ background nên Testcontainers chưa thể tạo container PostgreSQL tạm thời trong integration test.
  - CSDL cục bộ: Dịch vụ Windows `postgresql-x64-18` đang chạy trên cổng 5432.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
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
| 2026-09-21 | A0 | `python -c "import yaml; yaml.safe_load(open('docs/openapi.yaml', encoding='utf-8'))"` | PASS | `docs/openapi.yaml` hợp lệ 100% cú pháp OpenAPI 3.0.3 |
| 2026-09-21 | B1 | `web` / `npm.cmd install` | PASS | Đã cài 252 packages, sinh `web/package-lock.json` |
| 2026-09-21 | B1 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | Vite build hoàn thành 100%, tạo bundle `dist/assets` |
| 2026-09-21 | B1 | `mobile` / `npm.cmd install` | PASS | Đã cài 938 packages, sinh `mobile/package-lock.json` |
| 2026-09-21 | B1 | `mobile` / `npm.cmd run typecheck` | PASS | Typecheck TypeScript không lỗi |
| 2026-09-21 | B1 | `backend` / `.\mvnw.cmd test-compile` | PASS | Biên dịch 7 source files + 1 test file sang Java 17 bytecode |
| 2026-09-21 | B1 | `root` / `.\scripts\verify.ps1` | PASS | Tổng hợp kiểm tra 3 thành phần đều đạt |
| 2026-09-21 | B1 | `backend` / `.\mvnw.cmd test` | BLOCKED | Testcontainers không tìm thấy Docker daemon đang chạy |

## Checkpoint chi tiết

- **Task / status**: B1 / PASS (Scaffold hoàn tất cho cả 3 app và Docker Compose; Testcontainers BLOCKED chờ Docker daemon).
- **Files đã đổi / tạo mới**:
  - `infra/compose.yaml`, `infra/.env.example`
  - `backend/pom.xml`, `mvnw.cmd`, `mvnw`, `Dockerfile`, `src/` (configs, exception handler, responses, security, V001 migration)
  - `web/package.json`, `package-lock.json`, `vite.config.ts`, `src/` (MUI theme, router, connection status)
  - `mobile/package.json`, `package-lock.json`, `app.json`, `src/` (providers, layout, connection status)
  - `scripts/verify.ps1`, `scripts/dev.ps1`, `.gitignore`
  - `docs/STATUS.md` (cập nhật)
- **API/migration**: `V001__identity.sql` tạo các bảng `users`, `buildings`, `building_staff_assignments`, `invites`, `auth_sessions`, `refresh_tokens`.
- **Known failures/blockers**: Docker daemon chưa khởi động; cần bật Docker Desktop trước khi chạy integration test với Testcontainers.
- **Exact next action**: Tiến hành Task B2 — Triển khai Auth, tài khoản, token JWT, refresh rotation, cookie CSRF cho Web, SecureStore cho Mobile và phân quyền scope.
- **Git commit**: `09e9e3f` (feat(scaffold): complete Task B1 scaffold - backend, web, mobile, compose, and verify scripts).
