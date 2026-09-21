# Quy tắc nghiệp vụ và dữ liệu

Tài liệu này là nguồn quy tắc cho backend, web, mobile và kiểm thử nghiệm thu.
Các lựa chọn chi tiết dưới đây là **mặc định kỹ thuật được đề xuất để triển khai**, không phải mọi chi tiết đều đã được người dùng xác nhận riêng.
Giữ nguyên các quyết định đã thống nhất: Java/Spring Boot, React, React Native, PostgreSQL; cả web và app hỗ trợ ba vai trò.
Khi thay đổi một quy tắc, cập nhật tài liệu, dữ liệu bị ảnh hưởng và ca kiểm thử trước khi tiếp tục triển khai.

## 1. Phạm vi và quy ước chung

- **BR-001:** Phiên bản đầu phục vụ một đơn vị quản lý, một chủ nhà và nhiều tòa nhà; dữ liệu demo có 1–3 tòa.
- **BR-002:** Ba vai trò là `OWNER`, `STAFF`, `TENANT`; đây là vai trò, không phải ba use case.
- **BR-003:** Nghiệp vụ và quyền tương ứng có trên cả web và app; chỉ bố cục, điều hướng và thao tác thiết bị khác nhau.
- **BR-004:** Backend là nơi quyết định quyền, tính tiền, chuyển trạng thái và kiểm tra tính nhất quán.
- **BR-005:** Tiền dùng VND; mọi phép tính tiền dùng `BigDecimal`, không dùng `float`/`double`.
- **BR-006:** Làm tròn `HALF_UP` đến đơn vị đồng ở kết quả cuối của từng dòng hóa đơn; tổng hóa đơn bằng tổng các dòng đã làm tròn.
- **BR-007:** Tiền được lưu dưới dạng `numeric(19,0)` và truyền trong JSON bằng chuỗi thập phân, ví dụ `"3000000"`.
- **BR-008:** Chỉ số và lượng điện nước có độ chính xác tối đa ba chữ số thập phân, lưu `numeric(18,3)`; không âm.
- **BR-009:** Ngày nghiệp vụ dùng `LocalDate` theo `Asia/Ho_Chi_Minh`; thời điểm audit lưu UTC và hiển thị theo múi giờ nghiệp vụ.
- **BR-010:** Không xóa cứng dữ liệu đã được hợp đồng, hóa đơn, giao dịch hoặc lịch sử xử lý tham chiếu.
- **BR-011:** Mọi số liệu ví dụ trong tài liệu là dữ liệu mô phỏng cho đồ án; đơn giá thực tế do người có quyền cấu hình.

## 2. Tài khoản, phạm vi truy cập và người ở

- **BR-012:** `OWNER` truy cập toàn bộ dữ liệu của đơn vị; không có đăng ký công khai để tự trở thành chủ nhà.
- **BR-013:** `STAFF` chỉ thao tác dữ liệu thuộc các tòa được phân công; quyền phải được kiểm tra trên từng bản ghi, truy vấn và file.
- **BR-014:** `TENANT` được truy cập dữ liệu của hợp đồng mình đại diện; không suy quyền chỉ từ `roomId`.
- **BR-015:** Chủ nhà hoặc nhân viên được phân quyền tạo hồ sơ người đại diện và lời mời kích hoạt tài khoản.
- **BR-016:** Lời mời có thời hạn, dùng một lần; chỉ lưu hash của token; không đưa token thật vào log.
- **BR-017:** Người đại diện bắt buộc có tài khoản; thành viên cùng phòng chỉ có hồ sơ cư trú trong phiên bản đầu.
- **BR-018:** Một hợp đồng có đúng một người đại diện; người đại diện đồng thời là một thành viên cư trú.
- **BR-019:** Chưa hỗ trợ thay người đại diện giữa hợp đồng; nếu cần, kết thúc và quyết toán hợp đồng cũ, lập hợp đồng mới.
- **BR-020:** Thành viên cùng phòng không được cấp quyền tài khoản ngầm qua hồ sơ cư trú.
- **BR-021:** Người đại diện được xem hợp đồng, thành viên cùng hợp đồng, hóa đơn ISSUED, thanh toán và thông báo liên quan; gửi sự cố và phản hồi hóa đơn. TENANT không đọc được DRAFT qua list, detail, ảnh hoặc endpoint phụ.
- **BR-022:** Người thuê không được tự sửa hợp đồng, đơn giá, chỉ số tính tiền, hóa đơn hoặc khoản thu.
- **BR-023:** Sau khi kết thúc hợp đồng, người đại diện vẫn đọc được lịch sử hợp đồng của mình; không đọc được thông tin người thuê kế tiếp.
- **BR-024:** Người đại diện cũ chỉ thấy thông báo được gửi cho mình hoặc hợp đồng của mình, không thấy thông báo mới của phòng sau khi rời đi.
- **BR-025:** Tài khoản bị vô hiệu hóa không được đăng nhập/refresh; việc vô hiệu hóa không xóa hồ sơ hoặc lịch sử.
- **BR-026:** Đổi mã định danh trên URL hoặc API không được làm lộ dữ liệu khác phạm vi; cùng áp dụng cho ảnh, tệp đính kèm và bản xuất.

## 3. Phòng, hợp đồng và khoảng ngày cư trú

- **BR-027:** Mã phòng là duy nhất trong một tòa; sức chứa là số nguyên dương; không nhận số người đang ở vượt sức chứa.
- **BR-028:** Tình trạng cho thuê và tình trạng bảo trì được quản lý riêng; phòng đang có người ở vẫn có thể có sự cố đang sửa.
- **BR-029:** `AVAILABLE_FOR_RENT`/`BLOCKED_FOR_RENT` thể hiện có được nhận khách mới; sự cố nhỏ không tự đổi phòng sang trạng thái bị khóa cho thuê.
- **BR-030:** Phòng được tính là đang thuê khi có hợp đồng `ACTIVE`, kể cả ngày dự kiến kết thúc đã qua.
- **BR-031:** Phòng trống có thể cho thuê khi không có hợp đồng `ACTIVE` và không bị khóa cho thuê; dashboard tách phòng trống bị khóa riêng.
- **BR-032:** Hợp đồng có vòng đời `DRAFT → ACTIVE → ENDED`; bản nháp chưa có giao dịch có thể được hủy khỏi quy trình theo cơ chế lưu trữ.
- **BR-033:** Hợp đồng `DRAFT` không giữ chỗ; phiên bản đầu không hỗ trợ đặt phòng hoặc hợp đồng nhận phòng trong tương lai.
- **BR-034:** Chỉ kích hoạt hợp đồng khi bàn giao thực tế; kiểm tra phòng còn đủ điều kiện trong cùng transaction.
- **BR-035:** Một phòng chỉ có tối đa một hợp đồng `ACTIVE`; phải có ràng buộc database và kiểm tra đồng thời ở backend.
- **BR-036:** Khoảng thuê là `[actualStartDate, actualCheckoutDate)`: tính ngày nhận phòng, không tính ngày trả phòng.
- **BR-037:** Thời gian ở tối thiểu một ngày; `actualCheckoutDate` phải lớn hơn `actualStartDate`.
- **BR-038:** `plannedEndExclusive` là ngày trả dự kiến, mang ý nghĩa cận cuối không bao gồm; UI ghi rõ “Ngày trả dự kiến (không tính tiền ngày này)”.
- **BR-039:** Đến `plannedEndExclusive` không tự kết thúc hợp đồng, không tự giải phóng phòng và không tự ngừng tính tiền.
- **BR-040:** Gia hạn hợp đồng chỉ tăng ngày kết thúc dự kiến, lưu lịch sử và lý do; giữ nguyên giá thuê đã thỏa thuận trong phiên bản đầu.
- **BR-041:** Giá thuê tháng được chụp lại trên hợp đồng khi kích hoạt; thay giá niêm yết của phòng không đổi giá hợp đồng đang chạy.
- **BR-042:** Nhận phòng cần đủ người đại diện, thành viên ban đầu, tiền thuê, điều kiện cọc và chỉ số điện/nước bàn giao.
- **BR-043:** Trả phòng cần ngày trả thực tế, chỉ số điện/nước cuối và kiểm kê bàn giao; việc giải phóng phòng và kết thúc hợp đồng phải nguyên tử.
- **BR-044:** `ENDED` không đồng nghĩa đã thu đủ tiền hoặc hoàn hết cọc; khoản nợ, khoản dư và cọc còn giữ vẫn được xử lý sau đó.
- **BR-045:** Mỗi thành viên có khoảng cư trú `[moveInDate, moveOutDate)` nằm trong khoảng hợp đồng; ngày ra phải lớn hơn ngày vào.
- **BR-046:** Thay đổi thành viên ảnh hưởng phí theo người từ ngày có hiệu lực; không sửa lùi vào khoảng đã phát hành hóa đơn.
- **BR-047:** Không thay ngày nhận/trả hoặc chỉ số lịch sử để tính lại kỳ đã phát hành; sai sót xử lý bằng nghiệp vụ điều chỉnh có audit.
- **BR-048:** Chưa hỗ trợ chuyển phòng trực tiếp; dùng kết thúc hợp đồng cũ và tạo hợp đồng mới, giữ nguyên lịch sử hai hợp đồng.

## 4. Kỳ tính tiền, điện nước và đơn giá

- **BR-049:** Một kỳ hóa đơn là một tháng lịch theo giờ Việt Nam; mỗi hợp đồng có tối đa một hóa đơn cho một tháng.
- **BR-050:** Khoảng tính tiền của kỳ là phần giao giữa tháng lịch và khoảng thuê thực tế; phải có ít nhất một ngày.
- **BR-051:** Thu tiền theo kỳ đã sử dụng: chỉ phát hành sau khi khoảng tính tiền đã đóng, tại đầu tháng kế tiếp hoặc khi thực tế trả phòng.
- **BR-052:** Không phát hành trước tiền phòng của tháng đang ở; không tách thêm hóa đơn thường cho kỳ cuối đã có cùng hợp đồng/tháng.
- **BR-053:** Hóa đơn nháp được xem trước trước ngày đóng kỳ; chức năng phát hành bị chặn đến khi đủ điều kiện.
- **BR-054:** Tiền phòng dòng tháng = giá thuê tháng trên hợp đồng × số ngày ở trong tháng / số ngày lịch của tháng.
- **BR-055:** Nếu tính một khoảng qua nhiều tháng, tách mỗi tháng thành kỳ riêng; không lấy một mẫu số ngày dùng cho cả khoảng.
- **BR-056:** Chỉ làm tròn sau khi hoàn thành phép nhân/chia của dòng; không làm tròn giá theo ngày trước.
- **BR-057:** Chỉ số bắt đầu kỳ đầu là chỉ số nhận phòng; kỳ tiếp theo bắt đầu tại chỉ số kết thúc kỳ trước.
- **BR-058:** Chỉ số kết thúc ghi tại ranh giới tháng hoặc lúc trả phòng; hóa đơn cần đủ cả chỉ số đầu và cuối cho từng đồng hồ áp dụng.
- **BR-059:** Chỉ số cuối phải lớn hơn hoặc bằng chỉ số đầu; số nhỏ hơn là lỗi dữ liệu chặn phát hành, không chỉ là cảnh báo.
- **BR-060:** Tiền điện/nước = (chỉ số cuối − chỉ số đầu) × đơn giá hiệu lực của kỳ, làm tròn theo BR-006.
- **BR-061:** Bản ghi chỉ số có ngày đọc, người nhập, giá trị, ảnh tùy chọn và nguồn bàn giao/đọc kỳ/trả phòng.
- **BR-062:** Chưa hỗ trợ thay đồng hồ, quay vòng đồng hồ, đọc ước lượng hoặc chia lượng tiêu thụ qua nhiều đơn giá trong tháng.
- **BR-063:** Thiếu chỉ số bắt buộc thì chưa phát hành; không tự điền `0` hoặc dùng chỉ số ước lượng để vượt điều kiện.
- **BR-064:** Đơn giá điện/nước/dịch vụ được cấu hình theo tòa và có `effectiveMonth` ở đầu tháng; giá không âm.
- **BR-065:** Khi thiết lập lần đầu, cấu hình giá cho kỳ bắt đầu hoạt động; thay đổi về sau chỉ áp dụng từ tháng kế tiếp chưa chốt hóa đơn.
- **BR-066:** Không đổi giá giữa tháng, không sửa phiên bản giá đã được hóa đơn phát hành tham chiếu và không tạo hai giá cùng loại cùng tháng hiệu lực trong một tòa.
- **BR-067:** Kỳ dùng phiên bản giá có tháng hiệu lực gần nhất không sau kỳ đó; nếu không có phiên bản phù hợp thì chặn phát hành.
- **BR-068:** Hóa đơn lưu snapshot tên phí, cách tính, lượng dùng, đơn giá, khoảng ngày và thành tiền; thay cấu hình không làm đổi snapshot cũ.
- **BR-069:** Dịch vụ cố định theo phòng được phân bổ theo số ngày thuê trong tháng, cùng cách tính tiền phòng.
- **BR-070:** Dịch vụ theo người = đơn giá người/tháng × tổng số ngày cư trú của từng thành viên trong kỳ / số ngày tháng.
- **BR-071:** Số ngày-người tính từ các khoảng cư trú, không lấy số thành viên hiện tại nhân cho cả tháng.
- **BR-072:** Dịch vụ theo lượng sử dụng lấy số lượng thực tế × đơn giá; không phân bổ thêm theo ngày.
- **BR-073:** Khoản thu thêm cần tên, số tiền không âm, lý do và bằng chứng tùy chọn; được chụp lại trên dòng hóa đơn.
- **BR-074:** Một dịch vụ có một phương thức tính rõ ràng; thay phương thức chỉ tác động kỳ tương lai và phải lưu phiên bản cấu hình.

## 5. Vòng đời hóa đơn và điều chỉnh

- **BR-075:** Hóa đơn có trạng thái vòng đời `DRAFT` hoặc `ISSUED`; trạng thái thanh toán được tính riêng, không ghi đè vòng đời.
- **BR-076:** Nháp được sửa và tính lại; frontend không được gửi tổng tiền tùy ý để backend tin trực tiếp.
- **BR-077:** Khi phát hành, backend kiểm tra quyền, kỳ đóng, hợp đồng, đơn giá, chỉ số và ràng buộc duy nhất `(contract_id, billing_month)`.
- **BR-078:** Hóa đơn, dòng snapshot và audit phát hành được ghi trong một transaction; không có hóa đơn phát hành thiếu dòng.
- **BR-079:** Hóa đơn đã phát hành không sửa/xóa trực tiếp; không chuyển ngược về nháp.
- **BR-080:** Điều chỉnh là bản ghi bất biến gắn với hóa đơn, gồm chênh lệch có dấu, lý do, nội dung trước/sau, người lập và thời gian. effectiveDate là ngày lập theo giờ Việt Nam, recordedAt là thời điểm UTC; không backdate điều chỉnh hóa đơn trong V1.
- **BR-081:** Điều chỉnh có số tiền khác `0`; tổng phải trả sau toàn bộ điều chỉnh không được âm.
- **BR-082:** Điều chỉnh không thay thế nội dung gốc; trang chi tiết hiển thị giá trị gốc, từng điều chỉnh và tổng hiệu lực.
- **BR-083:** Nếu chỉ sửa mô tả không tác động tiền, ghi chú đính chính có audit riêng; không tạo điều chỉnh tài chính giá trị `0`.
- **BR-084:** Giảm hóa đơn đã thu đủ có thể tạo khoản dư; tăng hóa đơn đã thu đủ có thể tạo khoản nợ mới.
- **BR-085:** Giữ một hóa đơn mỗi hợp đồng/tháng kể cả sau trả phòng; sai số kỳ cuối xử lý bằng điều chỉnh trên hóa đơn đó.
- **BR-086:** Ngày đến hạn lấy từ cấu hình và được lưu khi phát hành; mặc định ngày phát hành cộng 7 ngày lịch. Quá hạn là thuộc tính suy ra khi còn nợ và ngày hiện tại lớn hơn ngày đến hạn; quản lý chọn ngày khác không trước ngày phát hành.

## 6. Sổ thanh toán, khoản dư và hoàn tiền

Mỗi dòng sổ thuộc đúng một hóa đơn. `amount` có dấu thể hiện số được áp dụng cho hóa đơn tăng hay giảm.

| Loại | Dấu | Ý nghĩa |
|---|---|---|
| `PAYMENT` | `+` | Tiền thực nhận, nhập thủ công và xác nhận |
| `PAYMENT_CORRECTION` | `+` / `−` | Sửa khoản thu đã nhập sai, tham chiếu `PAYMENT` gốc; không tự tạo chuyển tiền |
| `REFUND` | `−` | Tiền thực tế đã hoàn lại từ khoản dư |
| `CREDIT_OUT` / `CREDIT_IN` | `−` / `+` | Hai vế chuyển khoản dư giữa hai hóa đơn cùng hợp đồng |
| `DEPOSIT_OFFSET_IN` | `+` | Dùng tiền cọc đang giữ để thanh toán hóa đơn |

- **BR-087:** `effectiveDue = originalTotal + SUM(invoiceAdjustments)` và luôn `>= 0`.
- **BR-088:** `netApplied = SUM(invoiceLedger.amount)` trên các bút toán đã xác nhận và luôn `>= 0`.
- **BR-089:** `debt = MAX(effectiveDue − netApplied, 0)`; `credit = MAX(netApplied − effectiveDue, 0)`.
- **BR-090:** Trạng thái: `CREDIT` nếu có dư; `PAID` nếu không nợ và không dư; `PARTIAL` nếu còn nợ và `netApplied > 0`; còn lại `UNPAID`.
- **BR-091:** Hóa đơn bằng `0`, chưa thu gì được tính `PAID`; không bắt tạo khoản thu bằng `0`.
- **BR-092:** Khoản thu bình thường phải dương, ghi phương thức, ngày thực nhận, người ghi nhận và mã tham chiếu tùy chọn.
- **BR-093:** Cho phép thu lớn hơn nợ nhưng phải xác nhận rõ số dư phát sinh; backend yêu cầu cờ xác nhận, không chỉ dựa vào popup frontend.
- **BR-094:** Thanh toán một phần được tạo nhiều dòng `PAYMENT`; không ghi đè số đã thanh toán lên hóa đơn.
- **BR-095:** Sửa khoản thu dùng `PAYMENT_CORRECTION`, tham chiếu khoản thu gốc và ghi số chênh lệch; không sửa/xóa khoản thu cũ.
- **BR-096:** Tổng khoản thu gốc và các sửa sai gắn với nó không được âm; mọi thao tác còn phải giữ `netApplied >= 0`.
- **BR-097:** Sửa sai là đính chính dữ liệu, không phải chứng từ hoàn tiền; nhập 2 triệu thực nhận 1,5 triệu thì sửa `−500000`.
- **BR-098:** Nếu khoản tiền đã được hoàn/chuyển khiến sửa sai vi phạm số dư, từ chối và giải thích; không âm thầm sửa các giao dịch liên quan.
- **BR-099:** Hoàn tiền thực tế chỉ được ghi khi có khoản dư, số hoàn dương và không vượt dư hiện tại; ghi `REFUND` âm trên sổ.
- **BR-100:** Chuyển dư chỉ giữa hai hóa đơn đã phát hành của cùng hợp đồng, khác hóa đơn; số chuyển không vượt dư nguồn hoặc nợ đích.
- **BR-101:** Chuyển dư tạo hai bút toán bằng nhau, trái dấu, chung `transferId`, trong một transaction; không tính là thu/chi tiền mặt mới.
- **BR-102:** Chưa hỗ trợ chuyển dư sang hợp đồng khác, tự động chuyển dư hoặc thanh toán ngân hàng tích hợp.
- **BR-103:** Mọi thao tác có rủi ro lặp khi thử lại phải nhận `Idempotency-Key`; cùng khóa và payload trả kết quả cũ, payload khác trả lỗi xung đột.
- **BR-104:** Khóa và kiểm tra số dư trong transaction; thao tác nhiều hóa đơn khóa theo thứ tự ID tăng dần để hạn chế deadlock.
- **BR-105:** Hai yêu cầu hoàn cùng khoản dư không được cùng thành công nếu tổng vượt dư; hai yêu cầu thu cùng idempotency key chỉ tạo một giao dịch.
- **BR-106:** Không dùng tổng thanh toán của cả phòng hoặc cả người thuê để suy nợ một hóa đơn; chỉ dùng các dòng sổ được gắn đúng hóa đơn.
- **BR-107:** Khoản dư là số phải hoàn hoặc bù trừ, hiển thị riêng; không gắn nhãn “công nợ âm”.
- **BR-108:** Tất cả bút toán đã xác nhận là bất biến; phiên bản đầu chỉ sửa sai khoản `PAYMENT` gốc, chưa hỗ trợ sửa giao dịch hoàn/chuyển dư đã xác nhận.

## 7. Tiền cọc và quyết toán

- **BR-109:** Số cọc phải đóng nằm trên hợp đồng; tiền thực nhận nằm trong sổ cọc riêng, không nằm trong tiền thu hóa đơn.
- **BR-110:** Sổ cọc gồm `RECEIPT +`, `RECEIPT_CORRECTION ±`, `REFUND −`, `DEDUCTION −`, `OFFSET_OUT −`.
- **BR-111:** `depositHeld = SUM(depositLedger.amount)` và luôn không âm; cọc đã nhận có thể được ghi qua nhiều lần thu.
- **BR-112:** Sửa sai chỉ áp dụng phiếu nhận cọc gốc trong phiên bản đầu, có `sourceRef`, chênh lệch và lý do; không tạo thu/chi thật.
- **BR-113:** Hoàn hoặc khấu trừ phải là số dương không vượt cọc đang giữ; lý do bắt buộc, chứng từ/ảnh hỗ trợ là tùy chọn.
- **BR-114:** Dùng cọc trả nợ tạo `OFFSET_OUT` âm ở sổ cọc và `DEPOSIT_OFFSET_IN` dương ở sổ hóa đơn trong cùng transaction, chung mã liên kết.
- **BR-115:** Khoản bù cọc không vượt cọc đang giữ hoặc nợ hóa đơn; chỉ bù cho hóa đơn thuộc chính hợp đồng đó.
- **BR-116:** Chi phí sửa chữa được xử lý bằng một trong hai cách: khấu trừ cọc trực tiếp, hoặc lập khoản phải thu trên hóa đơn rồi bù cọc.
- **BR-117:** Không dùng cả hai cách cho cùng chi phí; lưu tham chiếu sự cố/chi phí để phát hiện thu trùng.
- **BR-118:** Hợp đồng `ENDED` còn giữ cọc vẫn được cộng vào KPI cọc đang giữ; không lọc theo hợp đồng đang hoạt động.
- **BR-119:** Trạng thái cọc: `NOT_RECEIVED`, `HOLDING`, `SETTLING`, `SETTLED`; chi tiết đã hoàn/khấu trừ thể hiện bằng tổng từng loại bút toán.
- **BR-120:** Chỉ xác nhận quyết toán cọc khi hợp đồng ENDED và số dư giữ bằng `0`; quyết toán cọc không tự đánh dấu hóa đơn đã hết nợ. Trước khi ghi xác nhận SETTLED, trạng thái SETTLING áp dụng hợp đồng đã kết thúc kể cả held bằng 0.
- **BR-121:** Sau khi quyết toán, mọi thao tác sửa sai làm phát sinh cọc phải được từ chối trong phiên bản đầu và nêu rõ giới hạn hỗ trợ.
- **BR-122:** Thu cọc, hoàn cọc và khấu trừ cọc có audit và idempotency như giao dịch hóa đơn.

## 8. Phản hồi hóa đơn, sửa chữa, thông báo và ảnh

- **BR-123:** Người đại diện gửi phản hồi từ một hóa đơn thuộc hợp đồng mình; phản hồi không tự sửa tiền và không tự dừng hạn thanh toán.
- **BR-124:** Phản hồi có nội dung, ảnh tùy chọn, trạng thái `OPEN/IN_REVIEW/RESOLVED`, người xử lý và lịch sử trao đổi.
- **BR-125:** Sự cố gắn với hợp đồng/phòng, người báo, mô tả và ảnh; người thuê chỉ tạo mới khi đang cư trú.
- **BR-126:** Luồng sự cố: `OPEN → ACCEPTED → IN_PROGRESS → RESOLVED → CLOSED`; nhân viên/chủ nhà xử lý trong phạm vi tòa.
- **BR-127:** Người báo được xác nhận hoàn tất hoặc yêu cầu mở lại từ `RESOLVED`; mở lại quay về `IN_PROGRESS` và cần lý do.
- **BR-128:** `CLOSED` chỉ thực hiện sau xác nhận người báo hoặc quản lý đóng có lý do; không tự đóng ngay khi thợ báo xong.
- **BR-129:** Chi phí sửa chữa không tự biến thành khoản thu người thuê; quản lý phải xác định trách nhiệm và chọn cách ghi nhận BR-116.
- **BR-130:** Ảnh không được truy cập bằng URL công khai vĩnh viễn; tải ảnh cần cùng quyền với bản ghi cha.
- **BR-131:** Chỉ nhận JPEG/PNG/WebP, tối đa 5 ảnh mỗi yêu cầu và 5 MB mỗi ảnh; backend kiểm tra nội dung thực, không chỉ phần mở rộng.
- **BR-132:** Ảnh chưa gắn bản ghi không được lộ cho người khác; có cơ chế dọn ảnh tạm mồ côi và giới hạn tải lên.
- **BR-133:** Thông báo bắt buộc trong ứng dụng gồm hóa đơn phát hành, điều chỉnh tiền và thay đổi trạng thái sự cố; push notification là mở rộng.
- **BR-134:** Thông báo gắn người nhận cụ thể tại thời điểm phát sinh; đọc/chưa đọc thuộc từng tài khoản.
- **BR-135:** Không suy người nhận lịch sử từ người đang ở trong phòng tại thời điểm mở thông báo.
- **BR-136:** Thông báo chỉ được tạo sau nghiệp vụ thành công; cơ chế gửi thử lại không tạo nhiều thông báo cho cùng sự kiện/người nhận.
- **BR-137:** Dữ liệu web/app nhất quán sau khi gọi lại API hoặc làm mới; bản đầu không cam kết cập nhật thời gian thực.

Quản lý có thể soạn thông báo trong ứng dụng cho người đại diện của các hợp đồng ACTIVE trong tòa được phép. Chụp danh sách người nhận lúc gửi; đây là hộp thông báo nội bộ, không gửi email/SMS/push.

## 9. Cảnh báo điện nước bất thường

- **BR-138:** Cảnh báo dựa trên quy tắc có thể giải thích, không quảng cáo là chẩn đoán rò rỉ hoặc mô hình AI.
- **BR-139:** So sánh kỳ hiện tại đủ tháng với trung vị ba kỳ hoàn chỉnh trước đó của cùng hợp đồng và cùng loại đồng hồ.
- **BR-140:** Chỉ so sánh khi số người ở không thay đổi trong cả bốn kỳ; nếu có kỳ đầu/cuối thiếu ngày hoặc thay thành viên thì bỏ đánh giá.
- **BR-141:** Cảnh báo khi đồng thời `current > 2 × median` và `current − median >= absoluteThreshold`.
- **BR-142:** Ngưỡng đề xuất: nước `10 m³`, điện `100 kWh`; các ngưỡng cấu hình được và có giá trị mặc định này cho demo.
- **BR-143:** Thiếu ba kỳ lịch sử so sánh thì trả `INSUFFICIENT_DATA`; khoảng không tương đồng trả `NOT_COMPARABLE`, không báo “bình thường”.
- **BR-144:** Hiển thị lượng hiện tại, ba kỳ tham chiếu, trung vị, mức vượt và điều kiện kích hoạt để người dùng kiểm tra được.
- **BR-145:** Quản lý có thể xác nhận số liệu đúng kèm lý do để tiếp tục phát hành; lưu người xác nhận, thời gian và dữ liệu cảnh báo.
- **BR-146:** Nếu thay chỉ số sau xác nhận thì tính lại cảnh báo và yêu cầu xác nhận lại; xác nhận cũ không áp dụng cho giá trị mới.
- **BR-147:** Cảnh báo mức dùng tăng được phép xác nhận; chỉ số cuối nhỏ hơn đầu hoặc thiếu số liệu bắt buộc vẫn chặn phát hành.

## 10. Thống kê, thời điểm và lịch sử kiểm tra

- **BR-148:** Mỗi bút toán tiền có `effectiveDate` nghiệp vụ và `recordedAt` thực tế; không dùng hai trường thay thế nhau.
- **BR-149:** Nhập khoản thu quá khứ cần nêu ngày thực thu và lý do nhập trễ; sửa sai giữ liên hệ khoản gốc và ngày hiệu lực tương ứng.
- **BR-150:** Số liệu kỳ quá khứ theo ngày hiệu lực có thể thay đổi khi nhập trễ/đính chính; UI ghi rõ đang xem số liệu cập nhật hiện tại.
- **BR-151:** “Giá trị hóa đơn kỳ” tính các hóa đơn `ISSUED` có `billingMonth` được chọn, cộng điều chỉnh thuộc chính các hóa đơn đó.
- **BR-152:** “Tiền thực thu hóa đơn trong khoảng” = `PAYMENT + PAYMENT_CORRECTION`, lọc theo ngày hiệu lực; phản ánh số thu đã được đính chính.
- **BR-153:** “Tiền hoàn hóa đơn trong khoảng” hiển thị riêng tổng giá trị tuyệt đối `REFUND`; thu ròng bằng thu đã đính chính trừ hoàn.
- **BR-154:** Chuyển dư và bù cọc không phải tiền mặt nhận mới, không được cộng vào BR-152; các luồng cọc báo cáo riêng.
- **BR-155:** Công nợ/khoản dư tại thời điểm được tính từ cùng tập hóa đơn và bút toán hiệu lực đến thời điểm đó; không trừ tiền thu tháng này vào hóa đơn tháng khác.
- **BR-156:** Báo cáo lịch sử dùng các hóa đơn đã phát hành đến thời điểm xem; loại nháp và bút toán chưa có hiệu lực đến thời điểm đó.
- **BR-157:** “Cọc đang giữ” lấy tổng số dư sổ cọc mọi hợp đồng, kể cả đã kết thúc; không trộn với khoản dư hóa đơn.
- **BR-158:** Không dùng nhãn “doanh thu thực tế” khi chưa định nghĩa cơ sở; dùng giá trị hóa đơn, tiền thực thu, tiền hoàn, công nợ và cọc đang giữ.
- **BR-159:** Hợp đồng sắp hết hạn mặc định trong 30 ngày tới, trạng thái `ACTIVE`; hợp đồng quá ngày dự kiến hiển thị nhóm riêng.
- **BR-160:** Sự cố chưa xử lý là trạng thái khác `CLOSED`; có thể tách số đang chờ tiếp nhận và số đang xử lý.
- **BR-161:** Audit tài chính ghi actor, vai trò, lý do, dữ liệu trước/sau, `recordedAt`, ID liên quan và `sourceRef` khi đính chính.
- **BR-162:** Audit không ghi mật khẩu, token hoặc dữ liệu nhạy cảm không cần thiết; không cung cấp thao tác xóa audit trên web/app.
- **BR-163:** Kiểm tra quyền và số dư chạy trong backend ngay cả khi giao diện đã ẩn nút hoặc hiển thị số tiền cho phép.
- **BR-164:** Không hỗ trợ đóng sổ kế toán, mở lại kỳ đã khóa hoặc tái tính toàn bộ lịch sử trong phiên bản đầu; không mô tả đồ án là phần mềm kế toán pháp định.

## 11. Ví dụ nghiệm thu với kết quả cố định

Mỗi hàng cần có ca kiểm thử backend; những luồng có giao diện quan trọng cần được chạy cả trên web và app.

| Mã | Đầu vào/thao tác | Kết quả phải đạt |
|---|---|---|
| EX-01 | Giá 3.000.000; tháng 30 ngày; nhận ngày 1, trả ngày 16 | 15 ngày, tiền phòng `1500000` |
| EX-02 | Giá 3.000.000; tháng 31 ngày; ở 1 ngày | `96774`, làm tròn một lần ở cuối dòng |
| EX-03 | Giá 3.000.000; nhận 20/09, trả 10/10 | Tháng 9: 11 ngày = `1100000`; tháng 10: 9 ngày = `870968` |
| EX-04 | Phí phòng 100.000/tháng; tháng 30 ngày, ở 15 ngày | Phí `50000` |
| EX-05 | Phí người 60.000/tháng; A ở 30 ngày, B ở 15 ngày trong tháng 30 ngày | 45 ngày-người, phí `90000` |
| EX-06 | Điện đầu 120,500; cuối 150,750; giá 3.500 | Lượng 30,250 kWh; tiền `105875` |
| EX-07 | Chỉ số cuối 99, đầu 100 | Từ chối phát hành, không cho xác nhận bỏ qua |
| EX-08 | Hóa đơn 3.000.000; thu 1.000.000 | `PARTIAL`, nợ `2000000`, dư `0` |
| EX-09 | Hóa đơn 3.000.000; thu 3.000.000; điều chỉnh hóa đơn −200.000 | `CREDIT`, nợ `0`, dư `200000` |
| EX-10 | Tiếp EX-09; thực hoàn 200.000 | `PAID`, netApplied `2800000`, dư `0` |
| EX-11 | Hóa đơn 3.000.000; nhập thu 2.000.000; sửa thu −500.000 | netApplied `1500000`, nợ `1500000`; tiền hoàn thực tế `0` |
| EX-12 | Hóa đơn gốc 100.000; điều chỉnh −100.001 | Từ chối vì effectiveDue âm |
| EX-13 | Hóa đơn A dư 200.000, B nợ 500.000, cùng hợp đồng; chuyển 150.000 | A dư `50000`; B nợ `350000`; thu tiền mới `0` |
| EX-14 | A dư 200.000; hai yêu cầu đồng thời hoàn 150.000 | Chỉ một thành công; dư còn `50000` |
| EX-15 | Cọc đã nhận 3.000.000; khấu trừ 500.000; hoàn 2.500.000 | Giữ `0`, khấu trừ `500000`, hoàn `2500000` |
| EX-16 | Cọc giữ 3.000.000; hóa đơn nợ 500.000; bù cọc 500.000 | Cọc giữ `2500000`; hóa đơn hết nợ; thu tiền mới `0` |
| EX-17 | Hợp đồng đã kết thúc nhưng còn cọc 1.000.000 | KPI cọc vẫn cộng `1000000` |
| EX-18 | Tháng 9 thu 1.000.000 cho hóa đơn tháng 8 | Tiền thu tháng 9 tăng `1000000`; công nợ hóa đơn tháng 8 giảm tương ứng |
| EX-19 | Ba kỳ nước đủ điều kiện: 8, 9, 10; kỳ mới 27 | Trung vị 9; vượt 18 và hơn 2 lần: có cảnh báo |
| EX-20 | Cùng số liệu EX-19 nhưng kỳ mới chỉ ở 15 ngày | `NOT_COMPARABLE`, không kết luận bình thường |
| EX-21 | Tháng 9 giá điện 3.500; tháng 10 đổi 3.800 | Hóa đơn tháng 9 giữ 3.500, snapshot không đổi |
| EX-22 | Hai yêu cầu kích hoạt hợp đồng cho cùng phòng | Một thành công, một xung đột; chỉ một hợp đồng ACTIVE |
| EX-23 | Hai yêu cầu phát hành cùng hợp đồng/tháng | Chỉ một hóa đơn và một bộ dòng được phát hành |
| EX-24 | Người thuê phòng cũ truy cập ID hóa đơn người thuê mới | Bị từ chối, không lộ số tiền hoặc ảnh |
| EX-25 | Cùng idempotency key gửi lại khoản thu 1.000.000 | Một khoản thu, một audit nghiệp vụ, kết quả trả lại cùng giao dịch |

## 12. Cổng hoàn thành nghiệp vụ

- Không đánh dấu hoàn thành nếu mới có giao diện hoặc dữ liệu mock; các luồng phải dùng API thật và database thật.
- Phải chạy được nhận phòng → đóng kỳ → phát hành → thu một phần → điều chỉnh → xử lý dư/nợ → trả phòng → quyết toán cọc.
- Phải kiểm tra quyền ba vai trò trên hai nền tảng, bao gồm thử truy cập ID của bản ghi ngoài phạm vi.
- Phải kiểm chứng trường hợp đồng thời và thử lại ở hợp đồng, hóa đơn, thu tiền, hoàn tiền và bù cọc.
- Khi một quy tắc ngoài phạm vi bị người dùng kích hoạt, trả thông báo rõ giới hạn thay vì giả lập thành công.
