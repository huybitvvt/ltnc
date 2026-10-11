# Kiểm tra source ngày 11/10/2026

Backend: portable JDK 17.0.20, Maven Wrapper 3.9.9, PostgreSQL 18.4 riêng tại localhost:55432; Flyway V001–V017. Database 18 không thay thế kiểm tra mục tiêu 16. Android build/install hoãn theo yêu cầu.

Lệnh: `backend/mvnw.cmd -B -ntp clean test` với datasource riêng và build directory riêng. Sau tests: `-DskipTests package` tạo JAR Spring Boot.

| Suite | Tests | Failures | Errors | Skipped |
|---|---:|---:|---:|---:|
| vn.trohub.auth.application.AuthServiceTest | 7 | 0 | 0 | 0 |
| vn.trohub.auth.application.SecurityScopeAuthorizationTest | 3 | 0 | 0 | 0 |
| vn.trohub.billing.application.BillingServiceTest | 9 | 0 | 0 | 0 |
| vn.trohub.billing.application.DepositServiceTest | 8 | 0 | 0 | 0 |
| vn.trohub.billing.application.FinancialLifecycleIntegrityTest | 4 | 0 | 0 | 0 |
| vn.trohub.billing.application.IdempotencyAndConcurrencyIntegrityTest | 3 | 0 | 0 | 0 |
| vn.trohub.billing.application.MoneyContractTest | 2 | 0 | 0 | 0 |
| vn.trohub.billing.application.PaymentServiceTest | 7 | 0 | 0 | 0 |
| vn.trohub.billing.application.PostgreSQLFinanceIntegrationTest | 8 | 0 | 0 | 0 |
| vn.trohub.metering.application.MeteringServiceTest | 6 | 0 | 0 | 0 |
| vn.trohub.operations.application.NotificationServiceTest | 7 | 0 | 0 | 0 |
| vn.trohub.operations.application.OperationsServiceTest | 9 | 0 | 0 | 0 |
| vn.trohub.operations.application.ReportingServiceTest | 4 | 0 | 0 | 0 |
| vn.trohub.pricing.application.PricingServiceTest | 8 | 0 | 0 | 0 |
| vn.trohub.property.application.PropertyServiceTest | 9 | 0 | 0 | 0 |
| vn.trohub.tenancy.application.TenancyServiceTest | 12 | 0 | 0 | 0 |
| vn.trohub.TroHubApplicationTests | 1 | 0 | 0 | 0 |
| vn.trohub.user.application.UserServiceTest | 3 | 0 | 0 | 0 |

Tổng: [110, 0, 0, 0]

Client: `npm run typecheck`, web `npm run test:run -- --maxWorkers=1`, mobile `npm run test:run -- --runInBand`, web `npm run build`. Logs bên cạnh report ghi kết quả thực tế.

Đây là bằng chứng source và backend integration; chưa kết luận toàn bộ FEATURE_MATRIX hoặc thiết bị native đạt. CI PostgreSQL 16 và browser E2E được bổ sung sau khi chạy.

Browser E2E: 4/4 PASS trên Edge headless với API HTTP thật, database runtime riêng được tạo từ rỗng. OWNER reload phiên, STAFF scope, TENANT invoice/quyền và mất phản hồi sau ghi thu (route.fetch rồi abort), gửi lại giữ cùng key và ledger chỉ có một PAYMENT. Xem browser-e2e.txt và web/e2e/roles.spec.ts.
