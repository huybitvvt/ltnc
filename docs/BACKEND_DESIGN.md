# Backend, API và cơ sở dữ liệu

## 1. Mục đích và giới hạn

- Đây là đặc tả triển khai, chưa phải backend đã được tạo hoặc kiểm thử.
- Đọc cùng `DOMAIN_RULES.md`, tài liệu frontend/mobile trong `docs/` và kế hoạch triển khai ở thư mục gốc.
- `DOMAIN_RULES.md` là nguồn quyết định nghiệp vụ; khi có khác biệt, sửa tài liệu kỹ thuật theo nghiệp vụ trước khi code.
- Backend duy nhất phục vụ web React và mobile React Native; cả hai có đủ ba vai trò.
- V1 phục vụ một tổ chức/chủ nhà, nhiều tòa nhà; không tạo SaaS nhiều tổ chức, ví người dùng hoặc hệ thống kế toán tổng quát.
- Mọi API quản lý đối tượng đều kiểm tra quyền tại backend, không tin role, buildingId hoặc tenantId từ client.

## 2. Stack và cấu trúc

- Java 17; Spring Boot 3.5.x bản ổn định đã kiểm tra tương thích; khóa patch cụ thể trong `pom.xml`.
- Maven Wrapper được commit; Spring Web, Security, Validation, Data JPA, Actuator và Spring AOP.
- PostgreSQL 16; Flyway quản lý schema; Hibernate `ddl-auto=validate` ngoài test đơn vị.
- OpenAPI 3 là hợp đồng API; tạo `docs/openapi.yaml` ở Phase A, trước khi FE/MB triển khai client.
- JUnit 5, Mockito cho logic thuần; Testcontainers PostgreSQL cho repository, transaction và phân quyền.
- Backend là modular monolith, chia theo tính năng; không chia controller/service/repository chung cho toàn hệ thống.

```text
backend/
  pom.xml, mvnw, mvnw.cmd, .mvn/wrapper/
  src/main/java/vn/trohub/
    TroHubApplication.java
    common/{config,error,security,money,time,pagination}/
    auth/{api,application,domain,infrastructure}/
    user/{api,application,domain,infrastructure}/
    property/{api,application,domain,infrastructure}/
    tenancy/{api,application,domain,infrastructure}/
    metering/{api,application,domain,infrastructure}/
    pricing/{api,application,domain,infrastructure}/
    billing/{api,application,domain,infrastructure}/
    finance/{api,application,domain,infrastructure}/
    maintenance/{api,application,domain,infrastructure}/
    feedback/{api,application,domain,infrastructure}/
    notification/{api,application,domain,infrastructure}/
    reporting/{api,application,infrastructure}/
    audit/{application,domain,infrastructure}/
    file/{api,application,domain,infrastructure}/
  src/main/resources/
    application.yml, application-local.yml, application-test.yml
    db/migration/V001__identity.sql ...
  src/test/java/vn/trohub/       # Đối xứng package của src/main/java
  src/test/resources/
```

- `api`: controller, request/response DTO; không trả trực tiếp JPA entity.
- `application`: use case, ranh giới transaction và điều phối kiểm tra quyền.
- `domain`: entity, enum, công thức và quy tắc; không gọi HTTP từ logic tính tiền.
- `infrastructure`: repository, triển khai storage và adapter kỹ thuật.
- Các module giao tiếp qua application service rõ ràng; tránh controller gọi repository của module khác.
- Không tạo interface và factory cho mọi lớp chỉ để tăng số lớp; dùng interface khi thực sự có nhiều cách tính phí.

## 3. Quy ước dữ liệu và API

| Nội dung | Quy ước bắt buộc |
|---|---|
| Prefix | `/api/v1`; UUID cho ID; không dùng số ID như cơ chế bảo mật |
| JSON | camelCase; UTF-8; enum UPPER_SNAKE_CASE |
| Response | `{ "data": ..., "meta": { "traceId": "..." } }` |
| Phân trang | `page=0&size=20`; tối đa 100; `meta` có page,size,totalElements,totalPages,traceId |
| Lỗi | `{ "code":"...", "message":"...", "fieldErrors":[], "traceId":"..." }` |
| Tiền | JSON chuỗi thập phân không phân cách, ví dụ `"3000000"`; Java BigDecimal; DB numeric(19,0) |
| Số lượng/chỉ số | JSON chuỗi thập phân, ví dụ `"12.500"`; BigDecimal; DB numeric(18,3) |
| Ngày nghiệp vụ | `YYYY-MM-DD`, Java LocalDate; tháng `YYYY-MM`; múi giờ Asia/Ho_Chi_Minh |
| Thời điểm | ISO-8601 có offset, lưu timestamptz/Instant UTC; Clock được inject để test |
| Khoảng ngày | `[startDate,endDate)`; endDate là ngày đầu tiên không tính tiền |
| Version | DTO cập nhật mang `version`; JPA @Version; stale update trả 409 |
| POST tạo | 201; POST hành động trả 200; DELETE draft trả 204; đọc trả 200 |
| Idempotency | `Idempotency-Key` UUID bắt buộc cho phát hành hóa đơn và mọi lệnh ghi tiền |

- Không dùng double/float để tính hoặc cộng tiền; tiền được làm tròn HALF_UP đến đồng tại từng dòng hóa đơn.
- Chỉ nhận các trường cho phép trong DTO; client không được gán role, tổng tiền, ownerId, status hoặc ledgerBalance tùy ý.
- Các trường tiền đầu vào có giới hạn dương/âm theo thao tác; kiểm tra vượt precision trước khi lưu.
- Sort chỉ nhận danh sách trường allowlist; tìm kiếm có phân trang, tránh query dẫn đến tải toàn bộ dữ liệu.
- Với đối tượng ngoài phạm vi, trả 404 để không tiết lộ sự tồn tại; sai quyền hành động trong phạm vi trả 403.
- Error code tối thiểu: VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VERSION_CONFLICT.
- Domain code: ROOM_NOT_AVAILABLE, CONTRACT_STATE_INVALID, BILLING_PERIOD_OPEN, READING_INVALID, READING_STALE.
- Finance code: INVOICE_ALREADY_ISSUED, IDEMPOTENCY_CONFLICT, INSUFFICIENT_CREDIT, DEPOSIT_INSUFFICIENT.

## 4. Xác thực và phân quyền

### 4.1. Tài khoản

- Seed đúng một OWNER từ biến môi trường khi chưa có owner; không hard-code mật khẩu hoặc in mật khẩu ra log.
- OWNER tạo STAFF và gán các tòa nhà; OWNER/STAFF có quyền trong tòa tạo lời mời TENANT đại diện hợp đồng.
- Không có đăng ký công khai, SMTP bắt buộc hoặc tự chọn role; thành viên ở cùng chỉ là hồ sơ cư trú.
- Invite có code ngẫu nhiên đủ mạnh, chỉ lưu hash, hạn 24 giờ, dùng một lần; reissue làm code cũ vô hiệu.
- Code chỉ trả một lần cho người quản lý có quyền tại thao tác tạo/cấp lại để chia sẻ thủ công.
- Reset mật khẩu dùng code một lần tương tự; hoàn tất reset thu hồi mọi phiên cũ của tài khoản.
- Không trả code ở GET/list hoặc ghi vào audit/log; trường hợp mất code thì cấp lại.
- Role cố định theo tài khoản V1; thay đổi staff assignment không thay role và có hiệu lực ngay.

### 4.2. Phiên đăng nhập

- JWT access token 15 phút; chứa sub, sid, exp, iss, aud; FE/MB giữ access token trong bộ nhớ.
- Refresh token opaque ngẫu nhiên, hạn tuyệt đối 7 ngày từ login; DB chỉ lưu hash, session/family và trạng thái sử dụng.
- Mỗi refresh đổi token và vô hiệu token cũ; phát hiện tái sử dụng token cũ thì thu hồi family đó.
- Client chỉ chạy một refresh tại một thời điểm; web phối hợp nhiều tab để tránh dùng đồng thời refresh token.
- Mọi request xác thực kiểm tra AuthSession còn hoạt động, tài khoản enabled và phạm vi dữ liệu hiện tại.
- Không tin danh sách tòa nhà được nhúng trong JWT; bỏ assignment hoặc logout phải mất quyền ngay.
- Web: refresh nằm trong cookie HttpOnly, Secure ở HTTPS, SameSite=Lax, Path=`/api/v1/auth/web`.
- Web production bố trí UI/API cùng site, ưu tiên reverse proxy cùng origin; dev dùng origin cụ thể trong allowlist.
- Các endpoint web thay đổi phiên kiểm tra Origin và CSRF token; FE gửi credentials cùng header CSRF.
- CSRF bootstrap là GET cho phép trước login; token phải gắn với cơ chế CSRF của server, không là chuỗi tùy ý.
- Mobile: refresh trả trong response, giữ trong SecureStore; gửi body đến `/auth/mobile/refresh` hoặc logout.
- Không lưu token vào localStorage, AsyncStorage, URL, log hoặc analytics; password hash bằng PasswordEncoder.
- Rate limit login, activation, reset và refresh; lỗi login không tiết lộ tài khoản tồn tại hay bị khóa.

### 4.3. Quyền đối tượng

- OWNER: mọi tòa nhà trong tổ chức; quản lý STAFF, assignment, tạo/sửa/archive tòa và tầng, cấu hình hệ thống.
- STAFF: nghiệp vụ, tài chính và báo cáo trong tòa được giao; không quản lý OWNER/STAFF hoặc tự cấp thêm scope.
- TENANT: chỉ hồ sơ/phòng/hợp đồng/hóa đơn của hợp đồng mình đại diện; không PATCH hợp đồng, hóa đơn, ledger.
- Người đại diện còn đọc lịch sử hợp đồng cũ của mình; không nhìn thấy cư dân/hóa đơn của hợp đồng kế tiếp.
- Tạo sự cố mới cần hợp đồng đang ACTIVE; xem sự cố và phản hồi hóa đơn lịch sử theo hợp đồng sở hữu.
- Không cấp quyền tenant qua roomId đơn thuần; truy vết contractId và representativeTenantId/userId.
- Kiểm tra permission trong application service và query scope; @PreAuthorize theo role một mình là chưa đủ.

## 5. Mô hình dữ liệu tối thiểu

Mỗi bảng nghiệp vụ có UUID, createdAt; bảng mutable thêm updatedAt/version. FK dùng RESTRICT cho dữ liệu có lịch sử.

| Nhóm | Entity và trường quan trọng |
|---|---|
| Identity | User(login,passwordHash,role,enabled); BuildingStaffAssignment(userId,buildingId) |
| Auth | Invite(userId,purpose,codeHash,expiresAt,consumedAt,createdBy); AuthSession(userId,familyId,expiresAt,revokedAt) |
| Refresh | RefreshToken(sessionId,tokenHash,issuedAt,usedAt,replacedById,expiresAt); giữ token đã dùng đến khi family hết hạn |
| Property | Building(name,address,active); Floor(buildingId,label,sortOrder,active); Room(buildingId,floorId,code,capacity,bookable,baseRent) |
| Billing config | BuildingBillingSettings(buildingId,dueDays,waterAbsoluteThreshold,electricityAbsoluteThreshold,version) |
| Tenant | TenantProfile(fullName,phone,...,userId nullable); ContractMember(contractId,tenantId,joinedOn,leftOn,isRepresentative) |
| Contract | Contract(roomId,representativeTenantId,status,actualStartDate,plannedEndExclusive,actualCheckoutDate,rent,depositRequired,depositSettlementAt,version) |
| Contract log | ContractEvent(contractId,type,oldValue,newValue,reason,actorId); bàn giao giữ chỉ số và tệp liên quan |
| Service | ServiceDefinition(name,unit,calculationType,active); ContractServiceSubscription(contractId,serviceId,startMonth,endMonthExclusive) |
| Tariff | Tariff(buildingId,serviceId,effectiveMonth,unitPrice); không có hai giá cùng scope/service/month |
| Manual usage | ServiceUsage(contractId,serviceId,billingMonth,quantity,reason,version); OneOffCharge(contractId,billingMonth,label,amount,reason,sourceRef) |
| Meter | RoomMeter(roomId,type,serial,installedOn,initialReading,active); MeterReading(meterId,readingDate,value,kind,version) |
| Billing | Invoice(contractId,billingMonth,status,periodStart,periodEndExclusive,dueDate,issuedAt,version) |
| Bill items | InvoiceItem(invoiceId,type,label,quantity,unitPrice,amount,calculationSnapshot,readingRefs,tariffRef) |
| Adjustments | InvoiceAdjustment(invoiceId,deltaAmount,reason,oldSnapshot,newSnapshot,effectiveDate,recordedAt,createdBy,operationId) |
| Invoice notes | InvoiceNote(invoiceId,content,reason,createdBy,recordedAt); đính chính mô tả không đổi tiền |
| Invoice ledger | InvoiceLedgerEntry(invoiceId,type,signedAmount,originalEntryId nullable,operationId,effectiveDate,recordedAt,createdBy,reason) |
| Deposit ledger | DepositLedgerEntry(contractId,type,signedAmount,originalEntryId nullable,operationId,effectiveDate,recordedAt,createdBy,reason,sourceRef) |
| Finance operation | FinancialOperation(id,idempotencyKey,actorId,action,requestHash,status,responseSnapshot,createdAt) |
| Maintenance | MaintenanceIssue(contractId,roomId,title,description,status,assigneeId,createdBy); IssueStatusHistory |
| Feedback | InvoiceFeedback(invoiceId,createdBy,message,status); InvoiceFeedbackReply(feedbackId,actorId,message) |
| Alert | ConsumptionAlert(contractId,meterType,billingMonth,readingVersion,evaluationStatus,comparisonSnapshot,acknowledgedBy,acknowledgedAt,reason) |
| Notification | Notification(userId,eventKey,type,title,message,resourceType,resourceId,readAt,createdAt); unique(userId,eventKey) |
| Files | StoredFile(storageKey,originalName,mimeType,size,uploadedBy,parentType,parentId,status) |
| Audit | AuditLog(actorId,buildingId nullable,action,entityType,entityId,beforeJson,afterJson,traceId,createdAt); audit global chỉ OWNER |

- Không lưu “số dư” mutable làm nguồn sự thật; tính từ ledger và adjustment hoặc materialized/read model có đối soát.
- Ledger thực thu lưu method và reference khi áp dụng. FinancialOperation lưu action và nguồn/đích để audit, không chứa credential trong responseSnapshot.
- Occupancy lấy từ hợp đồng ACTIVE; bookable là điều kiện vận hành riêng, phòng đang ở vẫn có thể có sự cố sửa chữa.
- Membership có khoảng ngày để tính phí theo người; không thay representative giữa hợp đồng trong V1.
- Giá thuê là snapshot trên hợp đồng; thay room.baseRent chỉ ảnh hưởng hợp đồng mới.
- Tariff chọn bản có effectiveMonth gần nhất nhưng không lớn hơn tháng hóa đơn; thiếu giá phải báo lỗi.
- Giữ snapshot tên dịch vụ, đơn vị, giá, số lượng và diễn giải phép tính trong InvoiceItem khi issue.
- Tệp ảnh chỉ số và bàn giao liên kết hợp đồng/kỳ tương ứng; không cấp tenant quyền đọc toàn bộ lịch sử meter của phòng.

## 6. Transaction, ràng buộc và ledger

### 6.1. Hợp đồng và điện nước

- DRAFT không giữ chỗ; activate diễn ra theo ngày hiện tại tại Việt Nam, không kích hoạt hợp đồng tương lai trong V1.
- Activate khóa Room, kiểm tra bookable, capacity, representative, chỉ số bàn giao và không có ACTIVE khác rồi mới đổi trạng thái.
- DB có partial unique index trên roomId khi Contract.status=ACTIVE để bảo vệ khi hai request chạy đồng thời.
- Gia hạn chỉ tăng plannedEndExclusive, lưu ContractEvent; quá ngày dự kiến vẫn ACTIVE và tính tiền đến checkout thực tế.
- Checkout khóa Room + Contract, chốt ngày trả/chỉ số/tiền kỳ cuối và kết thúc cư trú trong transaction.
- Checkout giải phóng phòng độc lập với hoàn cọc; công nợ/cọc chưa quyết toán vẫn gắn hợp đồng cũ.
- Chỉ số phải không giảm trong cùng meter; V1 chưa hỗ trợ thay/quay vòng đồng hồ hoặc ước lượng lượng tiêu thụ.
- Chỉ số tại ranh giới đầu tháng được dùng làm cuối kỳ trước và đầu kỳ sau; checkout không sớm hơn actualStartDate+1 ngày.
- Sửa reading bằng version; nếu reading đã thuộc hóa đơn ISSUED thì đi qua luồng điều chỉnh, không sửa ngầm snapshot cũ.

### 6.2. Hóa đơn

- Lifecycle lưu DRAFT/ISSUED; trạng thái UNPAID/PARTIAL/PAID/CREDIT và OVERDUE là giá trị suy ra riêng.
- Unique(contractId,billingMonth); có thể cập nhật draft hiện có, không tạo thêm invoice cùng hợp đồng/tháng.
- Preview không ghi ledger; issue tính lại phía server trong transaction và kiểm tra version/dữ liệu đầu vào.
- Chỉ issue sau khi kỳ đã kết thúc hoặc hợp đồng đã checkout; V1 không thu tiền phòng trước rồi quyết toán điện nước bằng hóa đơn thứ hai.
- Khóa Invoice khi issue/adjust/thu tiền; tạo invoice mới khóa Contract trước để bảo vệ unique và cùng kỳ.
- Cảnh báo reading không chặn vĩnh viễn; issue yêu cầu xác nhận kèm lý do nếu có cảnh báo chưa được duyệt.
- Adjustment chỉ thêm bản ghi delta và snapshot giải thích; invoice item gốc giữ nguyên; tổng sau điều chỉnh không âm.
- Backend đối chiếu correctedBreakdown và delta, không nhận tổng mâu thuẫn; đính chính mô tả không đổi tiền ghi note/audit riêng.
- Adjustment có effectiveDate là ngày lập theo giờ Việt Nam, recordedAt UTC; không cho backdate adjustment trong V1.
- Phản hồi hóa đơn không tự sửa số tiền; quản lý xử lý phản hồi và tạo adjustment bằng hành động riêng có liên kết.

### 6.3. Ledger hóa đơn và cọc

| Ledger | Dấu và ý nghĩa |
|---|---|
| Invoice PAYMENT | Dương: thực thu và ghi nhận cho đúng một invoice |
| Invoice PAYMENT_CORRECTION | +/-: sửa số liệu khoản PAYMENT đã ghi sai, có originalEntryId; không phải dòng tiền hoàn |
| Invoice REFUND | Âm: hoàn khoản đang dư cho người thuê |
| Invoice CREDIT_OUT / CREDIT_IN | Âm tại invoice nguồn / dương tại invoice đích, cùng contract, chung operationId |
| Invoice DEPOSIT_OFFSET_IN | Dương: cọc được bù vào khoản nợ invoice, có bản ghi cọc đối ứng |
| Deposit RECEIPT | Dương: nhận cọc |
| Deposit RECEIPT_CORRECTION | +/-: sửa khoản nhận cọc đã nhập sai, có originalEntryId |
| Deposit REFUND / DEDUCTION | Âm: hoàn cọc / khấu trừ theo lý do được xác nhận |
| Deposit OFFSET_OUT | Âm: dùng cọc trả invoice; đối ứng DEPOSIT_OFFSET_IN trong cùng transaction |

- Mỗi InvoiceLedgerEntry thuộc đúng một invoice; không tạo thêm module phân bổ nhiều-nhiều hoặc ví tổng quát.
- Điều chỉnh PAYMENT chỉ tham chiếu PAYMENT gốc; tổng PAYMENT và corrections của khoản đó không âm.
- Điều chỉnh giảm có thể làm invoice phát sinh nợ lại; tổng netApplied vẫn phải >=0; vi phạm do refund/transfer trước đó phải từ chối.
- Refund không vượt credit hiện có; transfer không vượt credit nguồn hoặc debt đích, hai invoice ISSUED khác nhau cùng contract.
- Transfer khóa hai invoice theo thứ tự UUID tăng dần; thất bại ở bên nào phải rollback cả hai.
- Offset cọc khóa Contract/cọc rồi invoice theo thứ tự thống nhất; số offset không vượt cọc đang giữ và nợ invoice.
- Deposit correction giữ tổng receipt gốc+corrections và cọc đang giữ >=0; sau SETTLED không cho sửa; vi phạm trả xung đột rõ ràng.
- Tổng phải trả = tổng InvoiceItem + tổng InvoiceAdjustment; netApplied = tổng InvoiceLedgerEntry.signedAmount, luôn >=0.
- Debt=max(0,tổng phải trả−netApplied); credit=max(0,netApplied−tổng phải trả).
- KPI tiền thu=PAYMENT+PAYMENT_CORRECTION theo effectiveDate; REFUND hiển thị riêng; CREDIT_IN/OUT và DEPOSIT_OFFSET_IN không là tiền mới.
- Correction giữ ngày hiệu lực khoản gốc; recordedAt là lúc ghi đính chính. Báo cáo kỳ quá khứ có thể cập nhật theo dữ liệu đính chính mới.
- Thu lớn hơn nợ cần `overpaymentConfirmed=true` phía backend; không chỉ dựa vào popup client.
- Cọc đang giữ là tổng DepositLedgerEntry.signedAmount trên mọi hợp đồng, kể cả ENDED chưa quyết toán.
- Settlement chỉ hoàn tất khi các khoản cọc đã được phân bổ và balance cọc bằng 0; không tự xóa khoản nợ còn lại.
- Chi phí sửa chữa có sourceRef; chọn khấu trừ cọc hoặc ghi lên invoice rồi offset, không ghi cả hai cho cùng chi phí.

### 6.4. Idempotency và audit

- Unique(actorId,idempotencyKey); cùng key + action + requestHash trả response cũ, không sinh thêm ledger/notification.
- Luôn kiểm tra tài khoản và quyền hiện tại trước khi trả kết quả idempotency cũ; requestHash chuẩn hóa body/path/action, không gồm token.
- Cùng key nhưng payload/action khác trả 409 IDEMPOTENCY_CONFLICT; giữ FinancialOperation cùng vòng đời dữ liệu tài chính.
- Operation, thay đổi nghiệp vụ, audit quan trọng và notification DB phải commit cùng transaction; không ghi operation SUCCESS trước commit.
- Race insert key: rollback attempt bị unique violation, đọc kết quả đã commit trong transaction mới; không tiếp tục dùng transaction đã lỗi.
- AOP dùng ghi thông tin thao tác/chỉ số thời gian; audit tài chính cần snapshot rõ do application service tạo trong transaction.
- Không log password, activation/reset code, refresh/access token, ảnh giấy tờ hoặc body chứa dữ liệu nhạy cảm.

## 7. Danh mục API

Quy ước: `O`=OWNER, `S`=STAFF trong tòa được giao, `T`=TENANT đúng hợp đồng; `M`=O/S. Ký hiệu `*` cần Idempotency-Key.
Các ID trong path/body đều phải kiểm tra quan hệ cha-con; mọi bảng dưới còn áp dụng lỗi 400/401/403/404/409 chung.

### 7.1. Auth và identity

| Method/path | Quyền | Request chính → Kết quả / lỗi |
|---|---|---|
| GET /auth/web/csrf | Public | → csrf token bootstrap; Cache-Control no-store |
| POST /auth/web/login | Public+CSRF/Origin | login,password → accessToken,user; Set-Cookie refresh / 401 |
| POST /auth/mobile/login | Public | login,password → accessToken,refreshToken,user / 401 |
| POST /auth/web/refresh | Cookie+CSRF/Origin | → accessToken,refresh cookie mới / 401 token reuse |
| POST /auth/mobile/refresh | Refresh body | refreshToken → accessToken,refreshToken mới / 401 |
| POST /auth/web/logout | Cookie+CSRF/Origin | → thu hồi session và xóa cookie; idempotent |
| POST /auth/mobile/logout | Refresh body | refreshToken → thu hồi session; idempotent |
| POST /auth/logout-all | O/S/T | → thu hồi tất cả session của chính mình |
| POST /auth/activate | Public,rate limit | code,newPassword → kích hoạt tài khoản; không trả session tự động |
| POST /auth/reset-password | Public,rate limit | code,newPassword → reset và revoke sessions |
| POST /auth/change-password | O/S/T | oldPassword,newPassword → đổi mật khẩu, thu hồi mọi session kể cả hiện tại; client về login |
| GET /auth/me | O/S/T | → user,role,buildingScopes,representativeContractIds |
| GET /users; GET /users/{id} | O; M với TENANT thuộc scope | filter,page → hồ sơ được phép xem, không có credential |
| POST /users/staff | O | name,login → user+activationCode; role do server đặt STAFF |
| PUT /users/{id}/building-assignments | O | buildingIds,version → thay assignment STAFF |
| POST /users/{id}/invitations/reissue | O; M với TENANT thuộc scope | purpose ACTIVATE/RESET → one-time code |
| PATCH /users/{id}/enabled | O; M với TENANT thuộc scope | enabled,version,reason → trạng thái; revoke khi disable |
| POST /tenants/{id}/account-invitation | M | login,contractId → tài khoản/lời mời đại diện hợp lệ |

### 7.2. Tòa nhà, cư trú và cấu hình tính tiền

| Method/path | Quyền | Request chính → Kết quả / lỗi |
|---|---|---|
| GET /buildings; GET /buildings/{id} | O/S | scope → danh sách/chi tiết |
| POST /buildings; PATCH /buildings/{id} | O | name,address,active,version → building |
| GET /buildings/{id}/floors; POST /buildings/{id}/floors | O/S; O | label,sortOrder → floors/floor |
| PATCH /floors/{id} | O | label,sortOrder,active,version → floor |
| GET /buildings/{id}/billing-settings; PATCH /buildings/{id}/billing-settings | O/S; O | dueDays,warningThresholds,version → cấu hình |
| GET /rooms; GET /rooms/{id} | O/S; T theo hợp đồng | buildingId,occupancy,bookable → room; tenant không thấy hợp đồng khác |
| POST /rooms; PATCH /rooms/{id} | M | floorId,code,capacity,baseRent,bookable,version → room |
| GET /tenants; GET /tenants/{id} | M; T chỉ mình | search,page → hồ sơ đã lọc trường theo quyền |
| POST /tenants; PATCH /tenants/{id} | M | thông tin cư trú,version → tenant |
| GET /contracts; GET /contracts/{id} | O/S/T | trạng thái,roomId,page → hợp đồng theo scope |
| POST /contracts; PATCH /contracts/{id} | M | roomId,representativeTenantId,dates,rent,depositRequired → draft |
| POST /contracts/{id}/members; PATCH /contracts/{id}/members/{memberId} | M | tenantId,joinedOn,leftOn,version → membership / capacity,date conflict |
| POST /contracts/{id}/activate | M | version,handoverReadingIds → ACTIVE / ROOM_NOT_AVAILABLE |
| POST /contracts/{id}/extend | M | endDateExclusive,reason,version → contract+event |
| POST /contracts/{id}/checkout * | M | checkoutDate,finalReadingIds,version,reason → ENDED,finalBillingPreview |
| GET /services; POST /services; PATCH /services/{id} | O/S; O; O | definition,type,unit → dịch vụ; dùng rồi không đổi type |
| GET /tariffs; POST /tariffs | O/S; M | buildingId,serviceId,effectiveMonth,unitPrice → lịch sử giá / period conflict |
| PATCH /tariffs/{id} | M | price,version → chỉ sửa giá chưa có hiệu lực/chưa dùng; các giá khác thêm kỳ mới |
| GET /contracts/{id}/services; POST /contracts/{id}/services | O/S/T; M | serviceId,startMonth → subscriptions |
| PATCH /contracts/{id}/services/{subscriptionId} | M | endMonthExclusive,version → kết thúc dùng dịch vụ theo kỳ |
| PUT /contracts/{id}/service-usages/{serviceId}/{month} | M | quantity,reason,version → lượng dịch vụ nhập tay, chỉ kỳ chưa phát hành |
| POST /contracts/{id}/one-off-charges; PATCH /one-off-charges/{id} | M | month,label,amount,reason,sourceRef,version → phụ phí chưa phát hành |
| GET /rooms/{id}/meters; POST /rooms/{id}/meters | M | type,serial,installedOn,initialReading → meters/meter |
| GET /meter-readings; POST /meter-readings; PATCH /meter-readings/{id} | M | meterId,date,value,kind,fileIds,version → reading+warnings |
| GET /consumption-alerts | M | contractId,billingMonth,page → cảnh báo và lý do bỏ đánh giá trong scope |
| POST /consumption-alerts/{id}/acknowledgements | M | readingVersion,reason → xác nhận đúng phiên bản số liệu; dữ liệu đổi trả409 |

### 7.3. Hóa đơn, tài chính và cọc

| Method/path | Quyền | Request chính → Kết quả / lỗi |
|---|---|---|
| GET /invoices; GET /invoices/{id} | O/S/T | contractId,month,paymentStatus → invoice+items+adjustments+balances; T chỉ ISSUED, draft trả404 |
| POST /invoices/preview | M | contractId,billingMonth → calculation,warnings,sourceVersions; chưa phát hành |
| POST /invoices/drafts | M | contractId,billingMonth → tạo/cập nhật draft cùng contract/month |
| POST /invoices/{id}/issue * | M | version,sourceVersions,warningAcknowledgements,dueDate → ISSUED / kỳ mở,dữ liệu đổi |
| POST /invoices/{id}/adjustments * | M | deltaAmount,reason,correctedBreakdown,feedbackId? → adjustment+balances |
| POST /invoices/{id}/notes | M | content,reason → đính chính mô tả không đổi tiền, có audit |
| GET /invoices/{id}/ledger | O/S/T | page → các khoản thu/điều chỉnh/hoàn/bù trừ có giải thích |
| POST /invoices/{id}/receipts * | M | amount,effectiveDate,method,reference?,overpaymentConfirmed → PAYMENT+balances |
| POST /invoice-ledger/{id}/corrections * | M | deltaAmount,reason → PAYMENT_CORRECTION+balances |
| POST /invoices/{id}/refunds * | M | amount,effectiveDate,reason → REFUND / INSUFFICIENT_CREDIT |
| POST /invoices/{id}/credit-transfers * | M | targetInvoiceId,amount,reason → cặp CREDIT_OUT/IN / khác contract,thiếu dư |
| GET /contracts/{id}/deposit | O/S/T | → required,received,refunded,deducted,offset,held,status,ledger |
| POST /contracts/{id}/deposit/receipts * | M | amount,effectiveDate,reference? → RECEIPT |
| POST /deposit-ledger/{id}/corrections * | M | deltaAmount,reason → RECEIPT_CORRECTION |
| POST /contracts/{id}/deposit/refunds * | M | amount,effectiveDate,reason → REFUND |
| POST /contracts/{id}/deposit/deductions * | M | amount,effectiveDate,reason,sourceRef,evidenceFileIds? → DEDUCTION |
| POST /contracts/{id}/deposit/offsets * | M | invoiceId,amount,reason → cặp OFFSET_OUT/DEPOSIT_OFFSET_IN |
| POST /contracts/{id}/deposit/settle * | M | version,reason → đã quyết toán khi ENDED và cọc held=0 |

### 7.4. Sự cố, tệp, thông báo và báo cáo

| Method/path | Quyền | Request chính → Kết quả / lỗi |
|---|---|---|
| GET /issues; GET /issues/{id} | O/S/T | status,contractId,page → sự cố theo scope và history |
| POST /issues | M/T | contractId,title,description,fileIds → OPEN; T cần ACTIVE |
| POST /issues/{id}/assign | M | staffId,version → người xử lý phải có scope tòa |
| POST /issues/{id}/transitions | M/T theo transition | targetStatus,reason,version → history; T chỉ xác nhận/đề nghị mở lại phần của mình |
| GET /invoices/{id}/feedback; POST /invoices/{id}/feedback | O/S/T; T | message,fileIds? → thread phản hồi |
| POST /invoice-feedback/{id}/replies; PATCH /invoice-feedback/{id}/status | M/T; M | message hoặc status,reason → thread |
| POST /files | O/S/T | multipart file,purpose,parentType,parentId? → fileId; không trả public URL |
| GET /files/{id}/content | O/S/T theo parent | → stream private; no-store; ngoài scope 404 |
| GET /notifications; PATCH /notifications/{id}/read | O/S/T | page/unread → thông báo của chính mình; read idempotent |
| POST /notifications/announcements | M | buildingId/contractIds,title,message → thông báo đến người nhận trong scope |
| GET /dashboard/summary | O/S | billingMonth,cashFrom,cashTo,asOf → KPI với định nghĩa riêng từng khoảng |
| GET /dashboard/me | T | contractId? → tổng quan hợp đồng, hóa đơn ISSUED, nợ/dư/cọc/sự cố của chính tài khoản |
| GET /reports/receivables; GET /reports/cashflow | O/S | buildingId,period/asOf,page → chi tiết đối soát KPI |
| GET /audit-logs | O; S trong scope | entity,actor,date,page → audit đã che dữ liệu nhạy cảm |

## 8. Migration, an toàn dữ liệu và kiểm thử

- Migration theo thứ tự: identity/auth → property/tenancy → services/meters → invoices → financial ledger → issues/files/notifications/audit.
- Flyway đã chạy không được sửa nội dung; thêm migration mới, review SQL destructive riêng; local reset phải là lệnh explicit.
- Unique floor(buildingId,label), room(buildingId,code); composite FK floor(buildingId,id) để room không mang buildingId khác tầng.
- Unique staff assignment(userId,buildingId), meter reading(meterId,readingDate), subscription đang chồng kỳ bị chặn theo contract/service.
- Index mọi FK truy vấn thường dùng; contract(roomId,status), invoice(contractId,billingMonth), ledger(invoiceId,effectiveDate), deposit(contractId,effectiveDate).
- Index notification(userId,readAt,createdAt), issue(roomId,status), audit(entityType,entityId,createdAt); kiểm tra query thật trước khi thêm index khác.
- DTO Bean Validation, exception handler thống nhất, CORS allowlist; không `*` với credentials; endpoint health public chỉ trả trạng thái tối thiểu.
- Upload V1 chỉ JPEG/PNG/WebP, tối đa 5 MB/tệp và 5 tệp/lần; kiểm tra magic bytes, kích thước pixel, giải mã/re-encode để bỏ metadata.
- Storage key ngẫu nhiên; thư mục private ngoài webroot; không ghép đường dẫn từ tên file; authorization mỗi lần download.
- File chưa gắn parent thuộc uploader và có hạn 24 giờ; attach kiểm tra ownership/purpose/scope; job xóa orphan tránh xóa file đã commit.
- Báo cáo dùng truy vấn aggregate có điều kiện scope và cùng định nghĩa thời gian; tiền cọc chưa hoàn của ENDED vẫn nằm trong held.
- Seed demo chỉ ở profile demo/local; dùng thông tin cư dân giả; mật khẩu demo từ env, không đưa credential thật vào repo.
- Unit test: prorate qua tháng 28/29/30/31 ngày, day boundary, tariff, membership, rounding, cảnh báo thiếu lịch sử.
- Integration test PostgreSQL: migrations, rollback ledger đôi, partial unique ACTIVE, không trùng issue và idempotency cùng/khác payload.
- Security test: STAFF vượt tòa, TENANT đoán UUID, tenant cũ xem tenant mới, download ảnh trái quyền, account disabled, assignment bị gỡ.
- Auth test: refresh rotation/reuse, logout chặn access token cũ qua sid, reset revoke sessions, cookie flags và web CSRF/Origin.
- Finance test: trả từng phần, sửa nhập sai, giảm hóa đơn sau khi trả đủ, refund/transfer vượt dư, cọc offset nguyên tử, ENDED chưa hoàn cọc.
- Concurrency test bằng hai transaction thật: cùng activate phòng, cùng issue kỳ, cùng refund số dư, cùng offset cọc; không dùng mock để chứng minh khóa.
- API contract test: OpenAPI khớp response/error, tiền là string, DTO không lộ hash/token/PII ngoài scope, paging và version conflict đúng.
- Lệnh kiểm tra backend sau từng phase liên quan: `./mvnw verify` hoặc `mvnw.cmd verify`; cần Docker cho Testcontainers và không được im lặng skip.
- Nghiệm thu BE: migrations chạy trên DB sạch, API thật chạy mọi luồng của ba vai trò, test bắt buộc pass, OpenAPI cập nhật và client tích hợp được.
