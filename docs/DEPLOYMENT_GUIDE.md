# Hướng dẫn triển khai TroHub: Vercel, Supabase & Backend

Tài liệu này giải đáp và hướng dẫn chi tiết cách triển khai hệ thống TroHub lên Cloud:
- **Web Frontend**: Triển khai lên **Vercel**
- **Database**: Sử dụng PostgreSQL trên **Supabase**
- **Backend API**: Giải pháp lưu trữ ứng dụng Spring Boot 3.5.x (Java 17) kết nối giữa Vercel và Supabase

---

## 1. Đánh giá kiến trúc: Vercel + Supabase có phù hợp không?

### 1.1. Database trên Supabase: **HOÀN TOÀN TỐT & CỰC KỲ KHUYẾN NGHỊ (100% OK)**
- **Bản chất**: Supabase cung cấp hệ quản trị cơ sở dữ liệu **PostgreSQL chuẩn** (PostgreSQL 15/16) trên cloud.
- **Tương thích TroHub**:
  - TroHub dùng Spring Data JPA, Hibernate và **Flyway (17 bản migrations)**.
  - Khi trỏ kết nối JDBC tới Supabase, Flyway sẽ tự động chạy tất cả 17 migration, tạo lập đầy đủ 34 bảng, trigger, index và ràng buộc dữ liệu.
  - Supabase có sẵn bảng quản trị Web (Table Editor, SQL Editor), tính năng sao lưu (Daily Backups) và giám sát hiệu năng.

### 1.2. Web Frontend trên Vercel: **HOÀN TOÀN TỐT (100% OK)**
- **Bản chất**: Thư mục `web/` của TroHub là một Single Page Application (SPA) xây dựng bằng **React + Vite**.
- **Tương thích TroHub**:
  - Vercel là nền tảng tối ưu hàng đầu cho Vite/React: CDN toàn cầu, build tự động từ Git, HTTPS miễn phí, tốc độ tải trang cực nhanh.
  - Dự án đã có sẵn tệp `web/vercel.json` để định tuyến SPA (fallback về `/index.html`), bảo đảm các đường dẫn con như `/contracts`, `/invoices`, `/incidents` không bị lỗi 404 khi người dùng tải lại trang.

### 1.3. Backend Spring Boot (Java 17): **LƯU Ý QUAN TRỌNG**
- **Vercel không hỗ trợ chạy ứng dụng Java monolith**: Vercel là nền tảng Serverless (chuyên Node.js, Next.js, Python serverless). Vercel **không hỗ trợ** chạy tiến trình JVM lâu dài (long-running Spring Boot service).
- **Giải pháp cho Backend**:
  - Triển khai Backend Spring Boot lên một PaaS hỗ trợ Docker/Java:
    1. **Render.com** (Khuyến nghị số 1: có gói Free/Starter, hỗ trợ Dockerfile sẵn có của TroHub, kết nối Supabase cực mượt).
    2. **Railway.app** (Triển khai 1-click từ repo Git, cực kỳ nhanh và ổn định).
    3. **Google Cloud Run** / **Fly.io** (Chạy Docker container serverless, chi phí thấp).
    4. **VPS (Ubuntu)** (Sử dụng `docker-compose.yml` có sẵn trong thư mục dự án).

---

## 2. Các bước triển khai chi tiết

### Bước 1: Khởi tạo Database PostgreSQL trên Supabase

1. Truy cập [https://supabase.com](https://supabase.com) và tạo một Project mới (chọn Region Singapore hoặc gần nhất).
2. Lấy thông tin kết nối Database:
   - Vào mục **Project Settings** -> **Database**.
   - Tìm mục **Connection string** -> chọn tab **JDBC** hoặc **URI**.
   - Chuỗi kết nối JDBC có dạng:
     ```
     jdbc:postgresql://db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
     ```
   - *Lưu ý*: Với Spring Boot và Flyway DDL migrations, hãy dùng cổng direct `5432` hoặc connection pooler ở chế độ **Session mode** (cổng 5432), không dùng Transaction mode (cổng 6543) khi chạy migration.
3. Mật khẩu kết nối là mật khẩu database bạn đã thiết lập khi tạo project trên Supabase.

---

### Bước 2: Triển khai Backend Spring Boot (ví dụ trên Render hoặc Railway)

1. **Chuẩn bị biến môi trường (Environment Variables)**:
   - `SPRING_DATASOURCE_URL`: `jdbc:postgresql://db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require`
   - `SPRING_DATASOURCE_USERNAME`: `postgres`
   - `SPRING_DATASOURCE_PASSWORD`: `<MẬT_KHẨU_SUPABASE_CỦA_BẠN>`
   - `SPRING_PROFILES_ACTIVE`: `prod` (hoặc `local`)
   - `JWT_SECRET`: Chuỗi ngẫu nhiên tối thiểu 64 ký tự hex/base64 bảo mật.
   - `OWNER_BOOTSTRAP_ENABLED`: `true` (cho lần khởi động đầu tiên để tạo tài khoản OWNER quản trị)
   - `OWNER_BOOTSTRAP_LOGIN`: `admin_owner`
   - `OWNER_BOOTSTRAP_PASSWORD`: `<MẬT_KHẨU_QUẢN_TRỊ_MẠNH>`
   - `TROHUB_CORS_ALLOWED_ORIGINS`: `https://*.vercel.app,http://localhost:5173` (đã được cấu hình trong `SecurityConfig.java` để cho phép Vercel gửi request và cookie an toàn).

2. **Cách build Backend**:
   - Nếu dùng Docker: Trỏ service tới thư mục gốc, hệ thống sẽ sử dụng `backend/Dockerfile` để build JAR với JDK 17.
   - Nếu build trực tiếp:
     - Build Command: `cd backend && ./mvnw clean package -DskipTests`
     - Start Command: `java -jar backend/target/trohub-backend-1.0.0-SNAPSHOT.jar`
3. Khi Backend khởi động, kiểm tra logs:
   - Flyway tự động kết nối Supabase và chạy: `Successfully validated 17 migrations... Current version of schema "public": 017`.
   - Kiểm tra endpoint sức khỏe: `https://<YOUR-BACKEND-URL>/actuator/health` trả về `{"status":"UP"}`.

---

### Bước 3: Triển khai Web Frontend lên Vercel

1. Đăng nhập [https://vercel.com](https://vercel.com) và chọn **Add New...** -> **Project**.
2. Chọn repository GitHub: `https://github.com/huybitvvt/ltnc`.
3. Cấu hình cài đặt dự án (Project Settings):
   - **Root Directory**: Nhấn Edit và chọn thư mục `web`.
   - **Framework Preset**: Chọn `Vite` (Vercel thường tự nhận diện).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Cấu hình Environment Variables trên Vercel**:
   - Thêm biến: `VITE_API_BASE_URL`
   - Giá trị: `https://<YOUR-BACKEND-URL>/api/v1` (URL của backend đã triển khai ở Bước 2).
5. Nhấn **Deploy**.
6. Vercel sẽ tự động build và cung cấp cho bạn một domain HTTPS (ví dụ `https://ltnc-trohub.vercel.app`).
7. File `web/vercel.json` đã có sẵn trong repo sẽ tự động kích hoạt điều hướng SPA mượt mà.

---

## 3. Danh sách kiểm tra sau khi triển khai (Verification Checklist)

- [ ] Supabase: Đã tạo project, bảng `flyway_schema_history` ghi nhận đủ 17 phiên bản.
- [ ] Backend: Endpoint `/actuator/health` trả về `{"status":"UP"}`.
- [ ] Vercel: Trang web tải nhanh, hiển thị giao diện đăng nhập tiếng Việt chuẩn đẹp.
- [ ] Đăng nhập OWNER: Đăng nhập thành công với tài khoản đã thiết lập ở `OWNER_BOOTSTRAP_LOGIN`.
- [ ] Cookie & CORS: Trình duyệt nhận được session cookie an toàn, không bị lỗi chặn CORS.
- [ ] Thao tác nghiệp vụ: Thử tạo tòa nhà, phòng, hợp đồng và xuất hóa đơn trên giao diện Vercel.
