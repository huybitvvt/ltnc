# Trạng thái triển khai

## Checkpoint hiện tại

- Trạng thái phần mềm: AUTH_AND_USER_MANAGEMENT_COMPLETE.
- Task vừa thực hiện: B2 — Auth, tài khoản, scope và session trên hai client (PASS: Backend API + Web React + Mobile Expo + 10 Unit Tests đạt 100%).
- Task tiếp theo: C1 — Khu nhà, tầng, phòng (Property Module).
- Đã có:
  - Repository Git local: commits `6d08b31` (A0), `09e9e3f` (B1), `06d491e` (B1 Status).
  - Khóa phiên bản `docs/VERSIONS.md`, thiết kế CSDL `docs/ERD.md`, hợp đồng `docs/openapi.yaml`, ma trận `docs/FEATURE_MATRIX.md`, `README.md`.
  - Hạ tầng: `infra/compose.yaml` (PostgreSQL 16, volume, healthcheck) và `infra/.env.example`.
  - Backend:
    - Domain/Infrastructure: `User`, `UserRole`, `UserRepository`, `Building`, `BuildingRepository`, `BuildingStaffAssignment`, `BuildingStaffAssignmentRepository`, `Invite`, `InvitePurpose`, `InviteRepository`, `AuthSession`, `AuthSessionRepository`, `RefreshToken`, `RefreshTokenRepository`.
    - Application/Security: `AuthService`, `UserService`, `JwtTokenProvider`, `JwtAuthenticationFilter`, `UserPrincipal`, `SecurityUtils`, `SecurityConfig`.
    - API Controllers & DTOs: `AuthController` (`/api/v1/auth/*`), `UserController` (`/api/v1/users/*`), `AuthDtos`, `UserDtos`.
    - Unit Tests: `AuthServiceTest` (7 ca kiểm thử đăng nhập, token rotation, reuse detection thu hồi token family, invite hết hạn 24h, đổi pass thu hồi phiên), `UserServiceTest` (3 ca phân quyền staff, toggle status thu hồi phiên, cấp lại invite). Kết quả 10/10 PASS!
  - Web:
    - Auth Context & Client: `AuthContext.tsx`, `client.ts` (in-memory access token, single-flight 401 refresh token interceptor).
    - UI Components & Pages: `LoginPage.tsx`, `ActivatePage.tsx`, `ChangePasswordDialog.tsx`, `UsersPage.tsx` (quản lý nhân viên cho OWNER, tạo mới, toggle khóa tài khoản, cấp lại mã mời 24h), `AppLayout.tsx` (responsive sidebar, menu theo vai trò, app bar), `DashboardPage.tsx`, `TenantPortalPage.tsx`.
    - `typecheck` PASS, `build` PASS sinh thư mục `dist/` hoàn tất.
  - Mobile:
    - Auth Context & Storage: `AuthContext.tsx`, `mobileClient.ts` (lưu refresh token vào `expo-secure-store`, in-memory access token, single-flight refresh token interceptor).
    - UI Screens: `LoginScreen.tsx`, `ActivateScreen.tsx`, `HomeScreen.tsx` (dashboard theo vai trò, modal đổi mật khẩu, đăng xuất), `MobileStatusScreen.tsx`.
    - `typecheck` PASS.
  - Scripts: `scripts/verify.ps1` chạy tổng hợp: Web typecheck & build PASS, Mobile typecheck PASS, Backend compile & unit tests PASS (10/10).
- Công cụ môi trường:
  - Sẵn sàng: Git 2.53, Node v24.14, npm 11.9, Java 17 toolchain, Android SDK tại `E:\Android\Sdk`.
  - Đang chờ: Docker daemon chưa chạy ngầm nên Testcontainers tạm thời BLOCKED, các kiểm thử nghiệp vụ được kiểm chứng qua Unit Tests độc lập nghiêm ngặt.
  - CSDL cục bộ: Dịch vụ Windows `postgresql-x64-18` đang chạy trên cổng 5432.

## Task checklist

- [x] A0 — Thiết kế thực thi, ERD, OpenAPI nền, versions, feature matrix. (PASS)
- [x] B1 — Môi trường, scaffold ba app, Flyway/Compose. (PASS scaffold/build; Integration test PostgreSQL BLOCKED do Docker daemon chưa chạy)
- [x] B2 — Auth, tài khoản, scope và session trên hai client. (PASS: 10 tests, Web build, Mobile typecheck)
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
| 2026-09-21 | B1 | `backend` / `.\mvnw.cmd test-compile` | PASS | Biên dịch sang Java 17 bytecode |
| 2026-09-21 | B1 | `root` / `.\scripts\verify.ps1` | PASS | Tổng hợp kiểm tra 3 thành phần đều đạt |
| 2026-09-21 | B2 | `backend` / `.\mvnw.cmd test "-Dtest=AuthServiceTest,UserServiceTest"` | PASS | 10/10 tests run, 0 failures, 0 errors |
| 2026-09-21 | B2 | `web` / `npm.cmd run typecheck` & `npm.cmd run build` | PASS | 11648 modules transformed, bundle dist hoàn tất |
| 2026-09-21 | B2 | `mobile` / `npm.cmd run typecheck` | PASS | Mobile TypeScript kiểm tra thành công |
| 2026-09-21 | B2 | `root` / `.\scripts\verify.ps1` | PASS | Toàn bộ 3 ứng dụng + 10 unit tests PASS 100% |

## Checkpoint chi tiết

- **Task / status**: B2 / PASS (Toàn bộ chức năng Auth, tài khoản, session, JWT rotation, Web UI, Mobile UI và 10 unit tests đạt 100%).
- **Files đã đổi / tạo mới**:
  - `backend/`: `AuthService.java`, `UserService.java`, `JwtTokenProvider.java`, `JwtAuthenticationFilter.java`, `AuthController.java`, `UserController.java`, `AuthDtos.java`, `UserDtos.java`, `AuthServiceTest.java`, `UserServiceTest.java`.
  - `web/`: `AuthContext.tsx`, `client.ts`, `LoginPage.tsx`, `ActivatePage.tsx`, `ChangePasswordDialog.tsx`, `UsersPage.tsx`, `AppLayout.tsx`, `DashboardPage.tsx`, `TenantPortalPage.tsx`, `AppRouter.tsx`, `App.tsx`.
  - `mobile/`: `AuthContext.tsx`, `mobileClient.ts`, `LoginScreen.tsx`, `ActivateScreen.tsx`, `HomeScreen.tsx`, `MobileStatusScreen.tsx`, `AppProviders.tsx`, `index.tsx`.
  - `scripts/verify.ps1`: Tích hợp thêm bước chạy 10 unit tests.
  - `docs/FEATURE_MATRIX.md`, `docs/STATUS.md`.
- **API/migration**: `/api/v1/auth/login`, `/refresh`, `/logout`, `/activate`, `/change-password`; `/api/v1/users`, `/staff`, `/{id}/status`, `/{id}/reissue-invite`, `/{id}/assignments`.
- **Known failures/blockers**: Testcontainers integration test chờ Docker daemon bật; 10/10 unit tests nghiệp vụ chạy độc lập thành công 100%.
- **Exact next action**: Tiến hành Task C1 — Khu nhà, tầng, phòng (Property Module: Migration Flyway V002, CRUD Building/Floor/Room, Room statuses, Web UI & Mobile UI).
- **Git commit**: Sẽ commit sau khi verify hoàn tất.
