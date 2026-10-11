# Phiên bản thực tế — 11/10/2026

Không dùng các lựa chọn “hoặc” trong tài liệu cũ để suy ra dependency đã chạy. Nguồn chính: backend/pom.xml và hai package-lock.json.

| Thành phần | Phiên bản |
|---|---|
| Java kiểm tra local | Temurin 17.0.20.1 |
| Spring Boot | 3.5.16 |
| Maven | 3.9.9 |
| Wrapper | 3.3.2, scripts Apache, tự tải JAR |
| PostgreSQL đích | 16-alpine (Compose/Testcontainers) |
| PostgreSQL fallback local | 18.4, DB kiểm thử riêng; không thay nghiệm thu PostgreSQL 16 |
| Node kiểm tra local | 24.14.0 |
| Node CI / Docker web | 22 |

## web

| Package | Lockfile version |
|---|---|
| react | 18.3.1 |
| vite | 6.4.3 |
| react-router-dom | 6.30.6 |
| @mui/material | 6.5.0 |
| axios | 1.20.0 |
| vitest | 3.2.7 |
| @playwright/test | 1.64.0 |

## mobile

| Package | Lockfile version |
|---|---|
| react | 18.3.1 |
| react-native | 0.76.7 |
| expo | 52.0.49 |
| expo-router | 4.0.22 |
| react-native-paper | 5.15.3 |
| jest | 29.7.0 |
| jest-expo | 52.0.6 |


Android SDK đã có trên máy phát triển nhưng APK/build native được hoãn theo yêu cầu. iOS: NOT_VERIFIED.
