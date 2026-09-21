# Nguồn chính thức và khóa phiên bản

Đối chiếu ngày 21/09/2026. Chỉ dùng nguồn chính thức cho hành vi framework.
Các quy tắc nhà trọ là thiết kế của dự án, không suy ra từ tài liệu framework.

| Nguồn | Điều đã kiểm chứng / cách sử dụng |
|---|---|
| [Spring Boot 3.5 system requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html) | Nhánh 3.5 hỗ trợ Java17; khóa patch ổn định cụ thể khi scaffold |
| [Spring transactions](https://docs.spring.io/spring-framework/reference/data-access/transaction.html) | Transaction ở service để bảo toàn thay đổi nhiều bảng |
| [Spring Data JPA locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html) | Lock truy vấn khi xử lý dữ liệu cạnh tranh |
| [Expo SDK reference](https://docs.expo.dev/versions/latest/) | Mỗi SDK gắn bộ React/RN/Node tương thích; cài native packages qua expo install |
| [Expo Router](https://docs.expo.dev/router/introduction/) | Routing theo file, dùng làm navigation root của mobile |
| [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) | Lưu refresh token của ứng dụng native |
| [Expo local development](https://docs.expo.dev/guides/local-app-development/) | expo run:android / native Android toolchain để chạy trên máy |
| [Expo local EAS limits](https://docs.expo.dev/build-reference/local-builds/) | Không giả định eas build --local được hỗ trợ trực tiếp trên Windows |
| [Vite](https://vite.dev/guide/) | Kiểm tra Node engines của phiên bản thực tế |
| [React Native networking](https://reactnative.dev/docs/network) | API network và yêu cầu cấu hình môi trường native |
| [Gemini CLI GEMINI.md](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html) | Context dự án; prompt không thay thế quyền truy cập filesystem/tools |
| [Gemini prompting](https://ai.google.dev/gemini-api/docs/prompting-strategies) | Task/context/đầu ra rõ ràng; không đảm bảo chạy vô hạn hoặc tự chứng minh chất lượng |

## Quy trình chọn phiên bản ở A0/B1

1. Ghi Java17 và PostgreSQL16; chọn patch ổn định hiện có, không SNAPSHOT.
2. Chọn Node LTS thỏa engines Vite và Expo SDK.
3. Chọn Expo SDK stable, giữ đúng React/RN đi kèm; không force dependency mismatch.
4. Ghi versions cụ thể của Maven Wrapper, Boot, JDK, Node, npm, Expo, RN,
   React từng client, Android SDK/Gradle toolchain trong docs/VERSIONS.md.
5. Commit pom và lockfiles; lần sau dùng npm ci. Không tự nâng mọi package lên latest.
6. Schema/generated types phải kiểm tra lại sau thay đổi framework.
7. iOS local cần môi trường Apple phù hợp; không ghi PASS chỉ vì Android chạy được.

## Windows

Ưu tiên npm.cmd, npx.cmd, mvnw.cmd trong PowerShell nếu execution policy chặn npm.ps1.
Build Android local qua Expo prebuild/Android Studio/Gradle trên máy có SDK.
EAS cloud chỉ là lựa chọn nếu người dùng đã cấu hình tài khoản/quyền; không mặc định
bắt buộc trả phí hoặc công bố ứng dụng.

