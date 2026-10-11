# TroHub

Hệ thống quản lý nhà trọ: Spring Boot/Java 17 + PostgreSQL, React/MUI web, Expo/React Native mobile. Kho công khai: https://github.com/huybitvvt/ltnc.

**Đang hoàn thiện và nghiệm thu.** Kết quả hiện tại, lỗi còn lại và bằng chứng nằm trong [STATUS](docs/STATUS.md) và [báo cáo đối chiếu](docs/IMPLEMENTATION_REVIEW.md). Code, unit test hoặc Hermes bundle không thay thế nghiệm thu toàn bộ ứng dụng. Build/cài APK Android được hoãn theo yêu cầu ngày 11/10/2026; iOS chưa kiểm tra.

## Chạy bằng Docker

Yêu cầu Docker Compose. Tạo cấu hình riêng, không commit:

```powershell
Copy-Item infra/.env.example infra/.env
```

Điền `JWT_SECRET` ngẫu nhiên ít nhất 32 byte, `OWNER_BOOTSTRAP_PASSWORD` ít nhất 12 ký tự, và đổi mật khẩu PostgreSQL trong `infra/.env`. Không dùng secret hoặc tài khoản mặc định ở môi trường thật.

```powershell
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

Web: http://localhost:8081. API: http://localhost:8080/api/v1. Health: http://localhost:8080/actuator/health. Swagger: http://localhost:8080/swagger-ui/index.html. Compose có ba service `db`, `backend`, `web`, volume DB và ảnh private. Cấu hình này phục vụ demo HTTP localhost; triển khai HTTPS cần bật `SECURE_COOKIES=true`.

OWNER được tạo một lần từ biến môi trường khi `OWNER_BOOTSTRAP_ENABLED=true`. Sau khi khởi tạo, tắt bootstrap. STAFF mới nhận mã mời và tự đặt mật khẩu; không có mật khẩu STAFF mặc định.

## Chạy từng ứng dụng

Yêu cầu JDK 17 (`JAVA_HOME`), Node 22, PostgreSQL 16; Maven 3.9.9 được Wrapper tự tải. `package-lock.json` là nguồn phiên bản npm thực tế.

Backend: đặt `SPRING_PROFILES_ACTIVE=local`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET` và các biến bootstrap trong môi trường của terminal. File `infra/.env` được Compose đọc; Maven không tự đọc file đó.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Web, trong terminal khác:

```powershell
cd web
npm.cmd ci
npm.cmd run dev
```

Mở http://localhost:5173. Vite chuyển `/api` và `/actuator` đến backend cổng 8080.

Mobile, kiểm tra code và chạy Metro khi cần:

```powershell
cd mobile
npm.cmd ci
npm.cmd run typecheck
npm.cmd start
```

`EXPO_PUBLIC_API_URL` phải kết thúc bằng `/api/v1`; Android emulator dùng `http://10.0.2.2:8080/api/v1`, máy thật dùng địa chỉ LAN của host. Backend phải được thiết bị truy cập. Mã native Android được Expo prebuild sinh ra và không commit; chạy `npx.cmd expo prebuild --platform android` khi quay lại bước build APK. Chưa có APK release được nghiệm thu.

## Kiểm tra

```powershell
./scripts/verify.ps1
```

Script chạy toàn bộ backend tests (bao gồm PostgreSQL/Testcontainers), web tests/build, mobile typecheck/tests và dừng khi có lỗi. Docker daemon cần hoạt động cho cấu hình test mặc định. Có thể kiểm tra trên database PostgreSQL riêng bằng các biến datasource; chỉ dùng database kiểm thử, không trỏ test vào DB đang sử dụng.

GitHub Actions chạy các kiểm tra trên Java 17, Node 22 và PostgreSQL 16 qua Testcontainers. Browser E2E chạy bằng `npm run test:e2e` tại web, với API/database kiểm thử riêng, `E2E_OWNER_LOGIN`, `E2E_OWNER_PASSWORD` và web dev server đang chạy. Cài browser bằng `npx playwright install chromium`, hoặc đặt `E2E_BROWSER_CHANNEL=msedge` nếu đã có Edge. Test tạo dữ liệu tổng hợp, không trỏ vào database thật. Nghiệm thu APK là gate riêng; CI unit test không tự chứng minh parity các vai trò.

Tiền VND đi qua API dưới dạng chuỗi số nguyên. Giao dịch tài chính dùng `X-Idempotency-Key`; request lặp cùng actor/key/payload trả snapshot đã lưu. Ngày nghiệp vụ theo `Asia/Ho_Chi_Minh`. Ảnh được kiểm tra nội dung, làm sạch metadata, lưu private và tải qua API có kiểm tra quyền.

## Tài liệu

- [Bắt đầu và tiếp tục công việc](START_HERE.md)
- [Quy tắc nghiệp vụ](docs/DOMAIN_RULES.md)
- [Task và tiêu chí nghiệm thu](docs/IMPLEMENTATION_TASKS.md)
- [Ma trận tính năng](docs/FEATURE_MATRIX.md)
- [Các sai lệch đã phát hiện](docs/IMPLEMENTATION_REVIEW.md)
- [Phiên bản thực tế](docs/VERSIONS.md)

Các tài liệu kế hoạch và Word gốc được giữ để đối chiếu. Ưu tiên quy tắc trong DOMAIN_RULES; không lấy nhãn PASS cũ làm bằng chứng hoàn thành.
