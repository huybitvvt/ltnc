# Backup và phục hồi

Backup chứa mật khẩu đã hash, dữ liệu cư trú và ảnh riêng tư. Lưu ngoài Git, hạn chế quyền đọc thư mục và mã hóa khi chuyển máy.

`scripts/backup_restore.py` dùng Python 3 và `pg_dump`, `pg_restore`, `psql` cùng major version với server. Kết nối bằng biến môi trường PostgreSQL hoặc `.pgpass`; không đặt mật khẩu trong command line. Dừng API và mọi job ghi dữ liệu trước khi backup, giữ API đích dừng đến khi đối chiếu xong. Script không tự dừng tiến trình của người dùng.

Ví dụ PowerShell cho database demo, thay giá trị bằng cấu hình thực tế:

```powershell
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '5433'
$env:PGUSER = 'trohub'
$env:PGDATABASE = 'trohub'
# Đặt PGPASSWORD qua môi trường riêng hoặc dùng pgpass.conf; không commit.
python scripts/backup_restore.py backup --backup backups/demo-2026-10-11 --storage uploads/private --api-stopped
```

`--storage` phải là thư mục thật của `trohub.storage.location`. Với Compose, dừng `backend` trước và sao chép volume `trohub_uploads` ra thư mục staging bằng `docker cp`; dùng đúng subdirectory `private` trong staging. Database vẫn chạy và có thể truy cập qua cổng được cấu hình trong `infra/.env`. Dùng client PostgreSQL 16 cho Compose hiện tại.

Để phục hồi, tạo **database mới rỗng**, không ghi đè database đang sử dụng:

```powershell
$env:PGDATABASE = 'trohub_restored'
createdb trohub_restored
python scripts/backup_restore.py restore --backup backups/demo-2026-10-11 --storage backups/restored-images --api-stopped
```

Có thể thêm `--pg-bin 'C:/Program Files/PostgreSQL/16/bin'` nếu các tool chưa có trong PATH. `createdb` cũng phải gọi từ cùng thư mục tool đó.

Script kiểm tra SHA-256 dump/ảnh trước restore; từ chối database hoặc thư mục đích có dữ liệu. Restore database trong một transaction, sau đó copy ảnh và so sánh số dòng từng bảng, tổng invoice items/adjustments, invoice ledger và deposit ledger. Chỉ khởi động API với database/storage mới khi có `RESTORE PASS`. Sau đó đăng nhập, mở hóa đơn cũ và tải ảnh riêng tư để kiểm tra HTTP. Khi dùng volume Compose mới, copy ảnh vào đúng đường dẫn trước khởi động backend.

Không dùng `pg_restore --clean`, xóa volume hoặc reset database đang dùng để thử phục hồi. Backup bị lỗi giữa chừng không có manifest hoàn chỉnh sẽ không được restore.
