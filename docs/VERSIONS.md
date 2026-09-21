# Bảng khóa phiên bản công nghệ (docs/VERSIONS.md)

Ngày lập: 21/09/2026.
Tài liệu này xác định và khóa toàn bộ phiên bản công nghệ cho hệ thống TroHub nhằm đảm bảo tính tương thích tuyệt đối giữa Backend, Web, Mobile, Cơ sở dữ liệu và Công cụ CI/CD.

---

## 1. Môi trường phát triển & Hệ điều hành

- **Hệ điều hành máy phát triển**: Windows 11 (build 26200).
- **Quy ước lệnh shell**: Do execution policy trên PowerShell Windows chặn file script `.ps1` chưa ký (`npm.ps1`, `mvnw.ps1`), mọi câu lệnh chạy npm/npx/mvnw phải sử dụng file thực thi command tương ứng:
  - `npm.cmd` thay vì `npm`
  - `npx.cmd` thay vì `npx`
  - `.\mvnw.cmd` thay vì `.\mvnw`

---

## 2. Danh mục phiên bản các thành phần

| Thành phần | Phiên bản khóa | Ghi chú & Tính tương thích |
|---|---|---|
| **JDK** | Eclipse Temurin OpenJDK 17.0.12+7 | Yêu cầu bắt buộc Java 17 LTS cho Spring Boot 3.5.x |
| **Spring Boot** | 3.5.0 (hoặc 3.4.3 nếu 3.5.x milestone) | Nhánh 3.5.x modular monolith |
| **Spring Framework** | 6.2.x | Đi kèm Spring Boot |
| **Spring Security** | 6.4.x | JWT access token + refresh rotation, CSRF cho web |
| **Spring Data JPA** | 3.4.x / Hibernate 6.6.x | `ddl-auto=validate`, locking cơ chế PESSIMISTIC/OPTIMISTIC |
| **Flyway** | 10.15.x | Quản lý schema database migration từ V001 |
| **PostgreSQL** | 16.4-alpine | Chạy qua Docker Compose và Testcontainers |
| **Maven Wrapper** | 3.9.9 (Maven Daemon tương thích) | Commit `.mvn/` và `mvnw.cmd` |
| **Node.js** | v24.14.0 (hoặc Node 20/22 LTS tương thích) | Đã cài đặt trên máy dev |
| **npm** | 11.9.0 | Chạy qua `npm.cmd` |
| **Web - Framework** | React 19.0.0 (hoặc 18.3.1 tương thích MUI 6) | SPA React TypeScript |
| **Web - Bundler** | Vite 6.2.0 | Build nhanh, dev server |
| **Web - Router** | React Router 7.2.x (hoặc 6.28.x) | Client-side routing, route guards |
| **Web - UI Component** | Material UI (MUI) v6.4.x | Design system hiện đại |
| **Web - Icons** | @mui/icons-material v6.4.x | Icon bộ MUI |
| **Mobile - SDK** | Expo SDK 52.0.x | Expo SDK ổn định |
| **Mobile - Runtime** | React Native 0.76.x | Đi kèm Expo SDK 52 |
| **Mobile - Router** | Expo Router v4.0.x | File-based routing |
| **Mobile - UI Component** | React Native Paper v5.13.x | Material Design cho React Native |
| **Mobile - Storage** | expo-secure-store ~14.0.x | Lưu trữ refresh token bảo mật |
| **Mobile - Image** | expo-image-picker ~16.0.x | Chọn ảnh/chụp ảnh sự cố, đồng hồ |
| **State / API Cache** | @tanstack/react-query v5.66.x | Dùng chung cho cả Web và Mobile |
| **Form & Validation** | react-hook-form 7.54.x + zod 3.24.x | Schema-driven form validation |
| **HTTP Client** | axios 1.7.x / fetch API wrapper | Interceptor refresh token tự động |
| **Backend Testing** | JUnit 5 (5.11.x), Mockito 5.14.x | Unit test logic nghiệp vụ |
| **Integration Testing**| Testcontainers PostgreSQL 1.20.x | Test database thật trong container |
| **Web Testing** | Vitest 3.0.x + React Testing Library | Unit/Component test cho Web |
| **E2E Testing** | Playwright 1.50.x | E2E browser test cho 3 vai trò |
| **Mobile Testing** | Jest + React Native Testing Library | Component test cho Mobile |
| **Android SDK** | API 34 / 35 (Android 14/15) | Cài đặt tại `E:\Android\Sdk` |
| **Android Build Tools**| 34.0.0 / 35.0.0 | Biên dịch native app Android |
| **OpenAPI** | 3.0.3 | Đặc tả API tại `docs/openapi.yaml` |

---

## 3. Khảo sát hiện trạng công cụ và giải pháp khắc phục

### 3.1. Đã sẵn sàng (PASS)
1. **Git**: `git version 2.53.0.windows.1` - Đã khởi tạo repository local.
2. **Node.js**: `v24.14.0`.
3. **npm**: `11.9.0` (sử dụng lệnh `npm.cmd`).
4. **Docker & Docker Compose**: `Docker version 29.5.3`, `Docker Compose v5.1.4`.
5. **Android SDK**: `E:\Android\Sdk`, Platform Tools `37.0.1` (`adb.exe` hoạt động).

### 3.2. Cần cấu hình bổ sung cho Task B1
1. **Java 17 LTS**:
   - Hiện trạng: Biến môi trường `JAVA_HOME` đang trỏ tới JBR của Android Studio (`C:\Program Files\Android\Android Studio\jbr` - OpenJDK 25).
   - Giải pháp: Cài đặt JDK 17 LTS (Eclipse Temurin 17) qua công cụ Windows Package Manager:
     ```powershell
     winget install EclipseAdoptium.Temurin.17.JDK
     ```
     Sau đó thiết lập `JAVA_HOME` và PATH trỏ tới JDK 17 để chạy Maven và backend Spring Boot.
2. **Maven Wrapper**:
   - Sẽ được scaffold ở Task B1 kèm theo file `mvnw.cmd` và cấu hình wrapper `.mvn/wrapper/maven-wrapper.properties`.
