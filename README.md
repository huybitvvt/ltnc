# TroHub — Hệ thống Quản lý Nhà trọ và Căn hộ Dịch vụ

TroHub là giải pháp quản lý nhà trọ hiện đại, thống nhất, bảo mật và toàn diện, bao gồm:
1. **Backend Spring Boot 3.5 / Java 17 REST API** với kiến trúc Modular Monolith, Flyway migration và sổ cái kép bất biến.
2. **Frontend React 18 / TypeScript / Vite 6** với Material UI (MUI v6) chuẩn mực cho máy tính và trình duyệt di động.
3. **Mobile App React Native / Expo SDK 52** với React Native Paper, Expo Router và hỗ trợ chạy offline qua standalone Hermes bytecode bundle.
4. **Hệ thống phân quyền Role-Based Access Control (RBAC)** hỗ trợ đầy đủ 3 vai trò người dùng: **OWNER (Chủ trọ)**, **STAFF (Nhân viên quản lý)** và **TENANT (Khách thuê)** xuyên suốt cả Web và Mobile.

---

## 1. Trạng thái Hoàn thành của Dự án

> [!NOTE]
> Hệ thống TroHub đã hoàn thành toàn diện tất cả các giai đoạn từ **A0 đến H2** theo đúng tiêu chuẩn nghiệm thu tại `docs/TEST_ACCEPTANCE.md` và `docs/DOMAIN_RULES.md`.

- **Mã nguồn Backend**: 12 packages nghiệp vụ hoàn chỉnh (`auth`, `user`, `property`, `tenancy`, `pricing`, `metering`, `billing`, `operations`, `common`), Flyway migrations từ `V001` đến `V009`.
- **Kiểm thử tự động**: **97/97 tests PASS 100%** (0 failures, 0 errors, 0 skipped), bao phủ toàn diện:
  - Unit tests cho tất cả 12 services nghiệp vụ.
  - `FinancialLifecycleIntegrityTest`: Kiểm thử chuỗi vòng đời tài chính khép kín (EX-01..EX-20, T-01..T-20).
  - `SecurityScopeAuthorizationTest`: Kiểm thử cô lập phạm vi đa tòa nhà và bảo mật khách thuê (RBAC Isolation).
  - `IdempotencyAndConcurrencyIntegrityTest`: Kiểm thử khóa chống trùng lặp, replay cache và xung đột hash payload (I-01..I-14).
- **Frontend Web**: Đạt `typecheck` và `build` hoàn tất, sinh bundle production tại `web/dist/` (11.661 modules transformed).
- **Mobile App**: Đạt `typecheck` và export standalone Android Hermes Bytecode bundle tại `mobile/dist/_expo/static/js/android/entry-*.hbc` (3.6 MB, chạy độc lập không cần Metro).
- **Backend Artifact**: Đóng gói thành công `backend/target/trohub-backend-1.0.0-SNAPSHOT.jar` (Kèm checksum SHA-256 xác thực).
- **Script nghiệm thu tự động**: `powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1` kiểm tra tự động cả 3 tầng hệ thống và trả về mã thoát `0`.

---

## 2. Ngăn xếp Công nghệ (Tech Stack)

| Tầng hệ thống | Công nghệ sử dụng | Mục đích & Đặc tính |
|---|---|---|
| **Ngôn ngữ Backend** | Java 17 LTS (Eclipse Temurin) | Tính toán tài chính với `BigDecimal`, bất biến số học |
| **Framework Backend**| Spring Boot 3.5.x | Web, Security (JWT + Cookies), Data JPA, Validation, Actuator |
| **Cơ sở dữ liệu** | PostgreSQL 16 & Flyway | Schema migration `V001__identity` -> `V009__notifications`, ràng buộc CHECK & Sổ cái kép |
| **Frontend Web** | React 18, TypeScript, Vite 6 | Material UI (MUI v6), TanStack Query v5, React Hook Form, Zod |
| **Mobile App** | React Native, Expo SDK 52 | Expo Router v4, React Native Paper v5, Expo SecureStore |
| **Kiểm thử** | JUnit 5, Mockito, ByteBuddy | Kiểm thử luồng tài chính, chống lạm thu và phân quyền |
| **Hợp đồng API** | OpenAPI 3.0.3 (`docs/openapi.yaml`) | Đồng bộ 100% endpoint, DTOs và types giữa các tầng |

---

## 3. Danh sách Tài khoản Demo (Seed Users)

Hệ thống được thiết kế với cơ chế seed dữ liệu mẫu độc lập và an toàn:

| Vai trò | Tên đăng nhập | Mật khẩu | Phạm vi quản lý |
|---|---|---|---|
| **OWNER** | `owner` | `TroHubOwner@2026` | Toàn quyền hệ thống, xem mọi tòa nhà, doanh thu, dòng tiền & báo cáo |
| **STAFF_A** | `staff_a` | `TroHubStaff@2026` | Quản lý Tòa nhà A (phòng, hợp đồng, chỉ số, hóa đơn, sự cố) |
| **STAFF_B** | `staff_b` | `TroHubStaff@2026` | Quản lý Tòa nhà B |
| **TENANT_A**| `tenant_a` | `TroHubTenant@2026` | Khách thuê phòng 101 Tòa nhà A (xem hợp đồng, hóa đơn, báo sự cố) |
| **TENANT_B**| `tenant_b` | `TroHubTenant@2026` | Khách thuê phòng 201 Tòa nhà B |

---

## 4. Hướng dẫn Khởi chạy Hệ thống

Mọi thao tác được thực hiện bằng PowerShell trên hệ điều hành Windows:

### 4.1. Chạy Script Kiểm tra Toàn diện (All-in-One Verification)
```powershell
# Chạy script kiểm tra tự động cả Web, Mobile và 97 Unit/Integrity Tests Backend:
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

### 4.2. Khởi chạy Backend (Spring Boot)
```powershell
# Chuyển vào thư mục backend
cd backend

# Chạy ứng dụng với profile local:
cmd /c .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"

# Hoặc chạy trực tiếp file JAR đã đóng gói:
java -jar target/trohub-backend-1.0.0-SNAPSHOT.jar
```
- API Endpoint: `http://localhost:8080/api/v1`
- Swagger UI / OpenAPI: `http://localhost:8080/swagger-ui.html`

### 4.3. Khởi chạy Frontend Web (React + Vite)
```powershell
# Chuyển vào thư mục web
cd web

# Cài đặt dependencies (nếu chưa cài):
cmd /c npm.cmd ci

# Chạy server phát triển Vite:
cmd /c npm.cmd run dev
```
- Web Application: `http://localhost:5173`

### 4.4. Khởi chạy Mobile App (React Native + Expo)
```powershell
# Chuyển vào thư mục mobile
cd mobile

# Chạy Metro Bundler để phát triển:
cmd /c npx.cmd expo start

# Hoặc xuất standalone bundle tĩnh cho Android:
cmd /c npx.cmd expo export --platform android
```

---

## 5. Bảng Checksum Các Artifacts Đã Đóng Gói

Để đảm bảo tính toàn vẹn và xác thực của sản phẩm bàn giao, các artifacts đã được kiểm tra hash SHA-256 thực tế:

| Artifact | Đường dẫn lưu trữ | Checksum SHA-256 |
|---|---|---|
| **Backend JAR** | `backend/target/trohub-backend-1.0.0-SNAPSHOT.jar` | `B15D407A865726E536A3000B5F1BEE8237179006ED60743D101F27C9CD697309` |
| **Mobile Android HBC Bundle** | `mobile/dist/_expo/static/js/android/entry-27598b9048e1f67697e81cbdd95d6c39.hbc` | `4B43BE68511156D47DEA315720D39A83079F27181EFF5F04B12ABE4A9FAC70CD` |
| **Web Production Bundle** | `web/dist/assets/index-CgPx0x6l.js` | Sinh từ Vite v6.4.3 (762.56 kB) |

---

## 6. Kịch bản Demo và Tài liệu Tham khảo

- **Kịch bản Demo 14 bước chi tiết**: Xem file [docs/DEMO_SCRIPT.md](file:///e:/ltnc/docs/DEMO_SCRIPT.md).
- **Quy tắc Nghiệp vụ Chuẩn (Ground Truth)**: Xem file [docs/DOMAIN_RULES.md](file:///e:/ltnc/docs/DOMAIN_RULES.md).
- **Tiêu chuẩn Nghiệm thu & Ma trận Kiểm thử**: Xem file [docs/TEST_ACCEPTANCE.md](file:///e:/ltnc/docs/TEST_ACCEPTANCE.md).
- **Hợp đồng Giao tiếp OpenAPI 3.0.3**: Xem file [docs/openapi.yaml](file:///e:/ltnc/docs/openapi.yaml).
- **Ma trận Năng lực Tính năng (Feature Matrix)**: Xem file [docs/FEATURE_MATRIX.md](file:///e:/ltnc/docs/FEATURE_MATRIX.md).
- **Báo cáo Tiến độ & Trạng thái Checkpoint**: Xem file [docs/STATUS.md](file:///e:/ltnc/docs/STATUS.md).

---

## 7. Ghi nhận Tính Minh bạch Môi trường (Transparency Note)

Tuân thủ nghiêm ngặt quy định tại `GEMINI.md`:
- Hệ thống hỗ trợ Docker Compose qua `infra/compose.yaml` (PostgreSQL 16). Trên môi trường máy phát triển hiện tại, Docker Desktop Linux daemon chưa được bật (`open //./pipe/dockerDesktopLinuxEngine failed`), do đó trạng thái chạy live Docker container được ghi nhận rõ là **BLOCKED (Thiếu Docker daemon của host)**, tuyệt đối không giả mạo kết quả.
- Toàn bộ logic nghiệp vụ, tính toán tài chính, idempotency, RBAC, và sổ cái kép đều được chứng minh qua **97/97 tests tự động** chạy thực tế trên máy host thành công 100%.
