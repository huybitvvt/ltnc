# TroHub — Hệ thống Quản lý Nhà trọ

TroHub là giải pháp quản lý nhà trọ hiện đại, thống nhất và bảo mật, bao gồm **Backend Spring Boot REST API + Cơ sở dữ liệu PostgreSQL + Frontend React Web + Mobile React Native/Expo Android**. Hệ thống hỗ trợ đầy đủ 3 vai trò người dùng: **OWNER (Chủ trọ), STAFF (Nhân viên quản lý) và TENANT (Người thuê)** trên cả hai nền tảng Web và Mobile theo cùng một hợp đồng API và ma trận phân quyền.

---

## 1. Trạng thái hiện tại của dự án

> [!IMPORTANT]
> **Phân biệt rõ trạng thái triển khai**:
> - **ĐÃ HOÀN THÀNH (Đã kiểm chứng thực tế)**:
>   - Toàn bộ hồ sơ kiến trúc, đặc tả nghiệp vụ, tài liệu thiết kế backend/frontend/mobile (`GEMINI_IMPLEMENTATION_PLAN.md`, `docs/DOMAIN_RULES.md`, `docs/BACKEND_DESIGN.md`, `docs/FRONTEND_DESIGN.md`, `docs/TEST_ACCEPTANCE.md`, `docs/DECISIONS.md`).
>   - Khảo sát hiện trạng công cụ trên máy phát triển (Git, Node, npm, Docker, Android SDK).
>   - Khóa phiên bản công nghệ cụ thể trong `docs/VERSIONS.md`.
>   - Thiết kế thực thi chi tiết bảng CSDL, khóa ngoại, partial index và ràng buộc sổ cái tại `docs/ERD.md`.
>   - Đặc tả chuẩn OpenAPI 3.0.3 tại `docs/openapi.yaml` (đã kiểm tra tính hợp lệ cú pháp YAML).
>   - Thiết lập Ma trận năng lực tính năng `docs/FEATURE_MATRIX.md`.
>   - Đạt Gate của Task **A0**.
> - **SẼ TRIỂN KHAI (Bắt đầu từ Task B1)**:
>   - Scaffold mã nguồn backend Java 17/Spring Boot 3.5, cơ sở dữ liệu Flyway migration và Docker Compose.
>   - Scaffold ứng dụng web React Vite MUI.
>   - Scaffold ứng dụng mobile React Native Expo.
>   - Xây dựng từng module tính năng theo trình tự phụ thuộc B2 -> H2.
>   - Biên dịch APK Android độc lập không phụ thuộc Metro.

---

## 2. Ngăn xếp công nghệ (Tech Stack)

- **Backend**: Java 17 LTS (Eclipse Temurin 17), Spring Boot 3.5.x (Web, Security, Data JPA, Validation, Actuator), Maven Wrapper.
- **Database**: PostgreSQL 16, Flyway Migration từ `V001`, Testcontainers PostgreSQL.
- **Web Frontend**: React 19/18, TypeScript, Vite 6, Material UI (MUI) v6, React Router, TanStack Query v5, Zod, React Hook Form.
- **Mobile App**: React Native, TypeScript, Expo SDK 52, Expo Router v4, React Native Paper v5, Expo SecureStore, Expo ImagePicker.
- **Testing**: JUnit 5, Mockito, Vitest, React Testing Library, Playwright E2E.
- **API Specification**: OpenAPI 3.0.3 (`docs/openapi.yaml`).

---

## 3. Cấu trúc thư mục định hướng

```text
ltnc/
├── backend/                  # Mã nguồn Spring Boot REST API
│   ├── src/main/java/vn/trohub/
│   ├── src/main/resources/db/migration/
│   └── pom.xml, mvnw.cmd
├── web/                      # Ứng dụng Web React (Vite + MUI)
│   ├── src/app/
│   ├── src/features/
│   └── package.json
├── mobile/                   # Ứng dụng Mobile React Native (Expo + Paper)
│   ├── src/app/
│   ├── src/features/
│   └── package.json
├── infra/                    # Cấu hình hạ tầng & Docker Compose
│   └── compose.yaml
├── docs/                     # Tài liệu thiết kế, quy tắc, ERD, OpenAPI, Status
│   ├── ERD.md                # Thiết kế cơ sở dữ liệu chi tiết
│   ├── openapi.yaml          # Đặc tả hợp đồng API OpenAPI 3.0.3
│   ├── VERSIONS.md           # Bảng khóa phiên bản công nghệ
│   ├── FEATURE_MATRIX.md     # Ma trận kiểm thử & năng lực tính năng
│   ├── DOMAIN_RULES.md       # Nguồn sự thật quy tắc nghiệp vụ
│   └── STATUS.md             # Checkpoint trạng thái thực tế
└── README.md
```

---

## 4. Hướng dẫn chạy các lệnh cơ bản (Môi trường Windows PowerShell)

Do cơ chế ExecutionPolicy của PowerShell trên Windows chặn các file `.ps1`, hãy luôn sử dụng các lệnh với đuôi `.cmd`:

```powershell
# Khởi động cơ sở dữ liệu PostgreSQL (khi scaffold infra)
docker compose -f infra/compose.yaml up -d db

# Kiểm tra cú pháp hợp đồng OpenAPI
python -c "import yaml; yaml.safe_load(open('docs/openapi.yaml', encoding='utf-8')); print('OpenAPI Valid!')"

# Chạy Backend (khi đã hoàn thành Task B1)
cd backend
.\mvnw.cmd test

# Chạy Web Dev Server (khi đã hoàn thành Task B1)
cd web
npm.cmd run dev

# Chạy Mobile Dev Metro (khi đã hoàn thành Task B1)
cd mobile
npx.cmd expo start
```

---

## 5. Tiến độ & Kế hoạch tiếp theo

Xem chi tiết trong `docs/STATUS.md` và `docs/IMPLEMENTATION_TASKS.md`.
Task tiếp theo cần thực hiện: **Task B1 — Scaffold backend, web, mobile và DB**.
