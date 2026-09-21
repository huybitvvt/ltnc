# KẾ HOẠCH TRIỂN KHAI TROHUB
## Hệ thống quản lý nhà trọ: Backend + Web + Mobile

Phiên bản: 2.0 — ngày 21/09/2026. Đây là đặc tả và kế hoạch giao việc cho Gemini, chưa phải phần mềm đã triển khai.

Nguồn: bản Word “Kế hoạch dự án - Hệ thống quản lý nhà trọ” và các trao đổi đã chốt cùng người dùng. Bản Word gốc được giữ nguyên. Tên “TroHub” là tên kỹ thuật mặc định, có thể đổi mà không ảnh hưởng nghiệp vụ.

## 1. Cách sử dụng bộ tài liệu

Đọc theo thứ tự:

| File | Nội dung | Khi nào đọc |
|---|---|---|
| [START_HERE.md](START_HERE.md) | Prompt khởi động, tiếp tục, cách giao tài liệu cho Gemini | Đầu tiên |
| [GEMINI.md](GEMINI.md) | Quy tắc làm việc và ghi checkpoint | Mọi phiên triển khai |
| File này | Phạm vi, kiến trúc, stack, mốc hoàn thành | Đầu dự án |
| [docs/DOMAIN_RULES.md](docs/DOMAIN_RULES.md) | Công thức, quyền, trạng thái và trường hợp đặc biệt | Trước mỗi nghiệp vụ |
| [docs/BACKEND_DESIGN.md](docs/BACKEND_DESIGN.md) | Module BE, DB, API, auth, transaction | Khi viết BE |
| [docs/FRONTEND_DESIGN.md](docs/FRONTEND_DESIGN.md) | Màn hình, luồng React và React Native | Khi viết FE/mobile |
| [docs/IMPLEMENTATION_TASKS.md](docs/IMPLEMENTATION_TASKS.md) | Task theo phụ thuộc, đầu ra, kiểm thử và nghiệm thu | Khi chọn việc tiếp theo |
| [docs/TEST_ACCEPTANCE.md](docs/TEST_ACCEPTANCE.md) | Bộ kiểm thử, dữ liệu ví dụ, demo, định nghĩa hoàn thành | Mỗi task và cuối dự án |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Quyết định mặc định và lịch sử thay đổi | Khi có lựa chọn thiết kế |
| [docs/STATUS.md](docs/STATUS.md) | Việc đã làm, đang dở, lệnh đã chạy, việc tiếp theo | Đầu/cuối mỗi phiên |
| [docs/SOURCES.md](docs/SOURCES.md) | Tài liệu chính thức và quy tắc khóa phiên bản | Khi dựng môi trường |

Đặc tả OpenAPI, ERD thực thi, migration và mã nguồn sẽ được Gemini tạo ở các task tương ứng; chúng chưa được tạo sẵn trong gói kế hoạch.

Thứ tự ưu tiên: chỉ dẫn mới của người dùng → quy tắc nghiệp vụ → backend/API contract → giao diện → checklist. Nếu có xung đột phải sửa tài liệu liên quan; không tự chọn hai cách khác nhau cho web và mobile.

Các quy tắc ngày thuê, stack phụ trợ, công thức cảnh báo và cách hoàn/bù trừ được chọn làm **mặc định triển khai đề xuất** để Gemini có thể bắt tay làm. Đây không phải các quy định pháp lý hay yêu cầu riêng của giảng viên. Người dùng có thể thay đổi bằng một quyết định mới.

## 2. Mục tiêu và phạm vi

### 2.1. Sản phẩm phải có

1. Backend Java/Spring Boot xử lý toàn bộ quyền truy cập và nghiệp vụ.
2. Website React cho OWNER, STAFF và TENANT.
3. App React Native cho OWNER, STAFF và TENANT.
4. PostgreSQL lưu dữ liệu chung; ảnh đính kèm lưu riêng, truy cập qua backend.
5. Tài liệu chạy dự án, API, kiểm thử và dữ liệu demo.

Mặc định nghiệm thu mobile bằng **APK Android cài và chạy được không phụ thuộc Metro**. Không tuyên bố đã hỗ trợ iOS nếu chưa build/chạy thật; không yêu cầu đưa app lên cửa hàng. Code React Native giữ khả năng mở rộng iOS.

Không giới hạn theo số tuần, không phân công theo người. Triển khai theo phụ thuộc và kết quả nghiệm thu.

### 2.2. Chức năng bắt buộc

| Nhóm | Chức năng |
|---|---|
| Tài khoản | Kích hoạt qua mã mời, đăng nhập/đăng xuất, đổi/reset mật khẩu, quản lý nhân viên và phạm vi |
| Bất động sản | Khu nhà, tầng, phòng, sức chứa, giá tham khảo, tạm ngừng cho thuê |
| Cư trú | Hồ sơ người thuê, người đại diện, thành viên cùng phòng, lịch sử cư trú |
| Hợp đồng | Nháp, nhận phòng/kích hoạt, gia hạn, trả phòng, theo dõi quá hạn |
| Điện nước | Công tơ, chỉ số bàn giao và cuối kỳ, ảnh chứng minh, kiểm tra dữ liệu |
| Giá và phí | Đơn giá theo kỳ; phí theo phòng, người, mức sử dụng; khoản bổ sung có lý do |
| Hóa đơn | Nháp, xem trước, phát hành, giải thích từng khoản, điều chỉnh có lịch sử |
| Thu tiền | Nhiều lần thu, sửa khoản nhập nhầm, tiền dư, hoàn tiền, bù trừ cùng hợp đồng |
| Tiền cọc | Nhận, sửa ghi nhận nhầm, hoàn, khấu trừ, bù trừ công nợ, quyết toán riêng |
| Hỗ trợ | Báo sự cố kèm ảnh, phân công, trạng thái, phản hồi hóa đơn |
| Thông báo | Sự kiện tự động và thông báo nội bộ do quản lý soạn; đã đọc/chưa đọc, liên kết đúng quyền |
| Cảnh báo | Kiểm tra tiêu thụ bất thường có giải thích và xác nhận của quản lý |
| Báo cáo | Giá trị hóa đơn, thực thu/hoàn, công nợ, tiền dư, cọc đang giữ, phòng và sự cố |
| Lịch sử | Người thao tác, thời gian, lý do; bảo toàn chứng từ đã xác nhận |

### 2.3. Ngoài phạm vi bản hoàn thành đầu tiên

Thanh toán ngân hàng tự động, SMS/email trả phí, OCR/AI, IoT, push notification, đặt tiện ích, hợp đồng điện tử có giá trị pháp lý, phần mềm kế toán/thuế, SaaS nhiều chủ độc lập, offline đồng bộ giao dịch tiền, microservices, đặt phòng tương lai, chuyển người đại diện giữa hợp đồng, thay/rollover công tơ tự động.

Các phần trên chỉ được bổ sung khi người dùng yêu cầu; hoàn tất lõi không tự mở rộng đề tài.

### 2.4. Ba vai trò trên cả hai nền tảng

| Năng lực | OWNER | STAFF | TENANT |
|---|---|---|---|
| Quản lý tài khoản nhân viên, gán khu nhà | Có | Không | Không |
| Xem/quản lý khu nhà, phòng | Toàn bộ | Trong khu được giao theo quyền | Chỉ thông tin phòng gắn hợp đồng mình |
| Hồ sơ cư trú, hợp đồng | Toàn bộ | Trong khu được giao | Xem hợp đồng mình đại diện |
| Giá, chỉ số, phát hành hóa đơn | Có | Trong khu được giao | Chỉ xem kết quả của mình |
| Thu tiền, điều chỉnh, cọc | Có | Trong khu được giao | Xem, không ghi giao dịch |
| Sửa chữa và phản hồi hóa đơn | Quản lý | Trong khu được giao | Gửi/theo dõi của mình |
| Dashboard | Toàn bộ | Trong khu được giao | Tổng quan cá nhân |
| Audit quản trị | Toàn bộ | Trong khu được giao | Không; chỉ timeline nghiệp vụ của mình |

Mỗi ô hợp lệ phải thực hiện được bằng **cả web và app**. Không giao toàn bộ app riêng cho TENANT. Cùng API và quyền, nhưng table web có thể thành card/form nhiều bước trên điện thoại.

## 3. Stack mặc định

| Thành phần | Lựa chọn |
|---|---|
| BE | Java 17, Spring Boot 3.5.x ổn định, Maven Wrapper |
| Spring | Web/MVC, Validation, Security, Data JPA, AOP, Actuator |
| DB | PostgreSQL 16, Flyway; Hibernate validate schema |
| API | REST /api/v1, OpenAPI 3.0.3, DTO độc lập entity |
| Web | React + TypeScript + Vite, React Router, MUI |
| Mobile | React Native + Expo ổn định + TypeScript, Expo Router, React Native Paper |
| State/form | TanStack Query, React Hook Form, Zod |
| Mobile APIs | Expo SecureStore, Expo ImagePicker |
| BE test | JUnit 5, Mockito, Spring Boot Test, PostgreSQL Testcontainers |
| FE test | Vitest + Testing Library; jest-expo + React Native Testing Library |
| E2E | Playwright web; app Android kiểm tra thật với bằng chứng, có thể tự động hóa sau |
| Hạ tầng | Docker Compose cho DB/API/web; mobile cài riêng |
| Package manager | npm; web/mobile có package-lock.json riêng |
| Node | Nhánh LTS tương thích cả Vite và Expo đã chọn, khóa phiên bản trong docs/VERSIONS.md |

Không dùng cả Expo Router lẫn một navigation root thứ hai. Không dùng MUI cho React Native. Không dựng Nx/Turborepo hoặc shared UI đa nền tảng ở bản đầu.

Khi scaffold: kiểm tra bản ổn định và bảng tương thích chính thức; chọn patch cụ thể rồi ghi docs/VERSIONS.md và lockfiles. Giữ nhánh Boot 3.5 để bám Spring/Java của môn, không mặc định nhảy Boot 4. Không nâng React Native tách khỏi Expo SDK. Nếu dependency bắt buộc không tương thích, ghi ADR và sửa bộ phiên bản đồng bộ.

## 4. Cấu trúc repository đích

Thư mục hiện tại là root; không tạo thêm một root lồng nhau chỉ để đổi tên.

```text
<project-root>/
  GEMINI.md
  GEMINI_IMPLEMENTATION_PLAN.md
  START_HERE.md
  README.md                         # hướng dẫn chạy thật, tạo khi triển khai
  backend/
    pom.xml, mvnw, mvnw.cmd, .mvn/
    src/main/java/vn/trohub/
      TroHubApplication.java
      common/{api,error,security,money,time,pagination,config}/
      auth/
      user/
      property/                     # building, floor, room
      tenancy/                      # tenant, contract, membership
      metering/
      pricing/
      billing/                      # invoice, explanation, adjustments
      finance/                      # invoice ledger, credit, deposit
      maintenance/
      feedback/
      notification/
      reporting/
      audit/
      file/                         # private storage và API tải ảnh
    src/main/resources/
      application.yml
      application-local.yml
      application-test.yml
      db/migration/
    src/test/java/vn/trohub/          # package khớp src/main/java
    src/test/resources/
    Dockerfile
  web/
    src/app/                        # providers/router/session
    src/features/<feature>/
    src/shared/{api,ui,lib,theme}/
    src/shared/api/generated/
    src/test/
    e2e/
    package.json, package-lock.json, .env.example
  mobile/
    src/app/                        # routes Expo Router, ít logic
    src/features/<feature>/
    src/shared/{api,storage,ui,lib,theme}/
    src/shared/api/generated/
    src/providers/
    src/test/
    app.config.ts, package.json, package-lock.json, .env.example
  docs/
    DOMAIN_RULES.md, BACKEND_DESIGN.md, FRONTEND_DESIGN.md
    IMPLEMENTATION_TASKS.md, TEST_ACCEPTANCE.md
    STATUS.md, DECISIONS.md, SOURCES.md
    openapi.yaml                    # tạo ở A0 và mở rộng theo task
    ERD.md, VERSIONS.md              # tạo ở A0
    FEATURE_MATRIX.md               # theo dõi API/Web/Mobile/Test
    evidence/                       # log đã loại secrets, ảnh demo test
  infra/
    compose.yaml
    .env.example
    uploads/                        # volume/local data, gitignored
  scripts/
    dev.ps1, verify.ps1, seed-demo.ps1
  .github/workflows/ci.yml
```

Trong từng module BE: controller → application service → repository/domain. Nghiệp vụ phối hợp nằm ở application service có transaction. Dùng interface khi có nhiều strategy hoặc biên tích hợp; không tạo interface cho mọi class chỉ để tăng số lớp.

Web/mobile tổ chức theo feature; component dùng lại nằm ở components. Hai client sinh type từ cùng OpenAPI; giao diện và state riêng, không sao chép logic tính tiền Java sang TypeScript.

## 5. Kiến trúc và luồng dữ liệu

```text
React web -------------------+
                             +--> Spring Boot REST API --> PostgreSQL
React Native Android app ----+             |
                                           +--> Storage ảnh riêng có kiểm tra quyền
                                           +--> Audit + Notification trong DB
```

- Một tổ chức quản lý các khu nhà; chưa triển khai hệ thống cho nhiều chủ độc lập.
- Backend là nguồn sự thật về số tiền, quyền, tính khả dụng phòng và trạng thái.
- Web/app gửi ý định như issue/refund/checkout; không gửi trạng thái PAID hay tự quyết toán.
- Mỗi chức năng xây xuyên API → web → mobile → test trước khi chuyển nghiệp vụ tiếp theo.
- Chưa cần realtime: refetch khi mở màn hình, focus, kéo làm mới hoặc sau thao tác thành công.

### 5.1. Quy ước xuyên suốt

- UUID cho ID; Instant lưu UTC, LocalDate theo Asia/Ho_Chi_Minh cho ngày nghiệp vụ.
- Tiền lưu numeric(19,0)/BigDecimal và trả JSON dưới dạng chuỗi, ví dụ "1500000".
- Chỉ số/số lượng lưu numeric(18,3), không dùng float cho số tiền.
- Một invoice/hợp đồng/tháng; ISSUED giữ nguyên snapshot; adjustment là bản ghi bổ sung.
- Lifecycle hóa đơn DRAFT/ISSUED tách khỏi trạng thái thanh toán tính từ ledger.
- Ngày nhận tính, ngày trả không tính: [startDate, checkoutDate), tối thiểu một ngày.
- Phát hành hóa đơn sau khi kết thúc khoảng tính tiền; kỳ cuối kết thúc lúc trả phòng.
- Cọc, thực thu và công nợ là các đại lượng riêng; không đặt nhãn “doanh thu thực tế” mơ hồ.
- Correction ghi nhận nhập sai không được giả thành một lần hoàn tiền thật.
- Idempotency, transaction và ràng buộc DB cùng bảo vệ hành động tạo tiền/chứng từ.

## 6. Cách áp dụng kiến thức môn học

| Kiến thức | Minh chứng trong dự án |
|---|---|
| OOP | Strategy tính phí ROOM_MONTHLY, PERSON_MONTHLY, METERED, snapshot kết quả |
| IoC/DI | Calculator registry, storage adapter, clock phục vụ test |
| MVC/REST | Controller DTO/Validation, service nghiệp vụ, response lỗi thống nhất |
| JPA | Quan hệ hợp đồng, thành viên, invoice lines, ledger và truy vấn có scope |
| Transaction | Issue invoice+lines; bù trừ cọc+invoice; credit transfer hai invoice cùng nguyên tử |
| AOP | Đo thời gian, log hành động tổng quát; audit tài chính đáng tin lưu cùng transaction |
| Security | Role + building scope + quyền đại diện hợp đồng, kiểm tra từng resource/file |
| Test | Tính ngày nhuận, làm tròn, điều chỉnh sau thu đủ, request đồng thời, rollback |

Không dùng AOP để thay thế ràng buộc nghiệp vụ, audit tiền hoặc kiểm tra quyền ở service.

## 7. Lộ trình triển khai

Chi tiết từng task nằm trong [IMPLEMENTATION_TASKS.md](docs/IMPLEMENTATION_TASKS.md).

| Giai đoạn | Task | Kết quả |
|---|---|---|
| A — Chốt thiết kế | A0 | ERD, OpenAPI nền, versions, feature matrix |
| B — Nền tảng | B1–B2 | Ba app chạy; ba role đăng nhập đúng quyền |
| C — Tài sản/cư trú | C1–C2 | Phòng, cư trú, hợp đồng và bàn giao |
| D — Tính tiền | D1–D2 | Giá/chỉ số/hóa đơn đúng và giải thích được |
| E — Tài chính | E1–E3 | Thu/điều chỉnh/tiền dư/cọc/trả phòng |
| F — Vận hành | F1–F2 | Sự cố, phản hồi, cảnh báo, thông báo, dashboard |
| G — Hoàn thiện client | G1 | Kiểm tra toàn bộ capability trên hai nền tảng |
| H — Nghiệm thu | H1–H2 | Tests, APK độc lập, đóng gói, README, demo |

G1 không phải thời điểm bắt đầu làm giao diện. Web/mobile phải được tích hợp trong từng task B–F.

Gemini tự tiếp tục task kế tiếp khi gate pass, không dừng sau mỗi phase chỉ để xin “tiếp tục”. Nếu phiên hết ngữ cảnh/quota thì lưu STATUS đầy đủ để chạy tiếp ở phiên mới. Prompt không thể bảo đảm một công cụ chạy vô hạn hoặc vượt giới hạn phiên.

## 8. Đầu ra hoàn thành

### Backend

- JAR/container chạy được; schema tạo từ Flyway trên PostgreSQL rỗng.
- OpenAPI khớp implementation; backend không phụ thuộc giao diện cụ thể.
- Tests tiền, quyền, đồng thời và rollback pass.

### Web

- Production build React phục vụ được, route refresh hoạt động.
- Cả ba vai trò có thao tác đúng quyền và trạng thái lỗi rõ.
- E2E với API thật; dữ liệu thay đổi từ app thấy được sau refetch.

### Mobile

- APK Android có JavaScript bundle đóng gói, cài và đăng nhập khi Metro tắt.
- Cả ba vai trò đầy đủ capability, ảnh/camera/quyền thiết bị chạy thật.
- Lỗi mạng, token hết hạn và gửi lại thao tác tiền không tạo trùng.
- Ghi rõ môi trường đã kiểm thử; iOS là NOT_VERIFIED nếu chưa thử.

### Bàn giao

- README setup từng thành phần, .env.example không secrets, seed giả lập có thể chạy lại.
- docs/FEATURE_MATRIX.md có API/Web/Mobile/Test và bằng chứng.
- docs/STATUS.md phản ánh trạng thái thực; test chưa chạy không đánh dấu pass.
- docs/evidence chứa lệnh và kết quả, video/ảnh hoặc bước demo đã thực hiện.
- Script/Compose khởi động sạch và hướng dẫn giữ/backup DB cùng ảnh.
- Không có nút trang trí, mock dữ liệu cuối cùng, TODO nghiệp vụ bắt buộc hoặc quyền chỉ chặn bằng UI.

## 9. Nguồn tham khảo

Các lựa chọn stack đã được đối chiếu tài liệu [Spring Boot](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [Expo SDK](https://docs.expo.dev/versions/latest/), [Expo Router](https://docs.expo.dev/router/introduction/) và [Gemini CLI context files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html). Danh sách và giới hạn đối chiếu nằm trong [SOURCES.md](docs/SOURCES.md).
