package vn.trohub.operations.application;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.trohub.billing.domain.Invoice;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.api.ConflictException;
import vn.trohub.operations.domain.*;
import vn.trohub.operations.infrastructure.*;
import vn.trohub.property.domain.Room;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.infrastructure.UserRepository;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class OperationsService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (BR-131)
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final MaintenanceIssueRepository issueRepository;
    private final IssueStatusHistoryRepository issueHistoryRepository;
    private final InvoiceFeedbackRepository feedbackRepository;
    private final InvoiceFeedbackReplyRepository feedbackReplyRepository;
    private final StoredFileRepository storedFileRepository;
    private final ContractRepository contractRepository;
    private final RoomRepository roomRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;

    private final Path storageDirectory;

    public OperationsService(
            MaintenanceIssueRepository issueRepository,
            IssueStatusHistoryRepository issueHistoryRepository,
            InvoiceFeedbackRepository feedbackRepository,
            InvoiceFeedbackReplyRepository feedbackReplyRepository,
            StoredFileRepository storedFileRepository,
            ContractRepository contractRepository,
            RoomRepository roomRepository,
            InvoiceRepository invoiceRepository,
            UserRepository userRepository,
            @Value("${trohub.storage.location:uploads/private}") String storageLocation
    ) {
        this.issueRepository = issueRepository;
        this.issueHistoryRepository = issueHistoryRepository;
        this.feedbackRepository = feedbackRepository;
        this.feedbackReplyRepository = feedbackReplyRepository;
        this.storedFileRepository = storedFileRepository;
        this.contractRepository = contractRepository;
        this.roomRepository = roomRepository;
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.storageDirectory = Paths.get(storageLocation).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Không thể khởi tạo thư mục lưu trữ file: " + storageLocation, e);
        }
    }

    // ==========================================
    // MAINTENANCE ISSUES (BR-125..BR-129)
    // ==========================================

    public OperationsDtos.IssueDto createIssue(OperationsDtos.CreateIssueRequest req, UUID actorId) {
        Contract contract = contractRepository.findById(req.contractId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy hợp đồng: " + req.contractId()));

        // BR-125: Người thuê chỉ tạo mới khi đang cư trú (contract ACTIVE)
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new ConflictException("Hợp đồng không ở trạng thái ACTIVE (" + contract.getStatus() + "), không thể tạo sự cố mới");
        }

        Room room = roomRepository.findById(req.roomId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phòng: " + req.roomId()));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng: " + actorId));

        if (req.fileIds() != null && req.fileIds().size() > 5) {
            throw new IllegalArgumentException("Chỉ được đính kèm tối đa 5 ảnh mỗi yêu cầu (BR-131)");
        }

        MaintenanceIssue issue = new MaintenanceIssue(contract, room, req.title(), req.description(), actor);
        MaintenanceIssue savedIssue = issueRepository.save(issue);

        // Ghi lịch sử ban đầu
        IssueStatusHistory initialHistory = new IssueStatusHistory(
                savedIssue,
                IssueStatus.OPEN,
                IssueStatus.OPEN,
                "Khởi tạo sự cố mới",
                actor
        );
        issueHistoryRepository.save(initialHistory);

        // Gắn file đính kèm nếu có
        List<UUID> attachedFileIds = new ArrayList<>();
        if (req.fileIds() != null) {
            for (UUID fileId : req.fileIds()) {
                storedFileRepository.findById(fileId).ifPresent(file -> {
                    file.setParentType(ParentType.MAINTENANCE_ISSUE);
                    file.setParentId(savedIssue.getId());
                    file.setStatus("ATTACHED");
                    storedFileRepository.save(file);
                    attachedFileIds.add(file.getId());
                });
            }
        }

        return toIssueDto(savedIssue, attachedFileIds, List.of(toHistoryDto(initialHistory)));
    }

    @Transactional(readOnly = true)
    public OperationsDtos.IssueDto getIssue(UUID id) {
        MaintenanceIssue issue = issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sự cố: " + id));

        List<StoredFile> files = storedFileRepository.findByParentTypeAndParentId(ParentType.MAINTENANCE_ISSUE, id);
        List<UUID> fileIds = files.stream().map(StoredFile::getId).toList();

        List<IssueStatusHistory> historyList = issueHistoryRepository.findByIssueIdOrderByCreatedAtAsc(id);
        List<OperationsDtos.IssueStatusHistoryDto> historyDtos = historyList.stream()
                .map(this::toHistoryDto)
                .toList();

        return toIssueDto(issue, fileIds, historyDtos);
    }

    @Transactional(readOnly = true)
    public List<OperationsDtos.IssueDto> listIssues(UUID contractId, UUID roomId, IssueStatus status) {
        List<MaintenanceIssue> issues;
        if (contractId != null) {
            issues = issueRepository.findByContractIdOrderByCreatedAtDesc(contractId);
        } else if (roomId != null) {
            issues = issueRepository.findByRoomIdOrderByCreatedAtDesc(roomId);
        } else if (status != null) {
            issues = issueRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            issues = issueRepository.findAllByOrderByCreatedAtDesc();
        }

        return issues.stream().map(issue -> {
            List<StoredFile> files = storedFileRepository.findByParentTypeAndParentId(ParentType.MAINTENANCE_ISSUE, issue.getId());
            List<UUID> fileIds = files.stream().map(StoredFile::getId).toList();
            return toIssueDto(issue, fileIds, Collections.emptyList());
        }).toList();
    }

    public OperationsDtos.IssueDto updateIssueStatus(UUID id, OperationsDtos.UpdateIssueStatusRequest req, UUID actorId) {
        MaintenanceIssue issue = issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sự cố: " + id));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng: " + actorId));

        IssueStatus current = issue.getStatus();
        IssueStatus target = req.status();

        if (current == target) {
            // Không đổi trạng thái, cập nhật comment nếu có
            if (req.comment() != null && !req.comment().isBlank()) {
                IssueStatusHistory history = new IssueStatusHistory(issue, current, target, req.comment(), actor);
                issueHistoryRepository.save(history);
            }
            return getIssue(id);
        }

        // Kiểm tra chuyển trạng thái hợp lệ (BR-126..BR-128, trả 409 Conflict nếu sai)
        validateStatusTransition(current, target, req.comment());

        issue.setStatus(target);
        issue.setUpdatedAt(Instant.now());
        issueRepository.save(issue);

        IssueStatusHistory history = new IssueStatusHistory(issue, current, target, req.comment(), actor);
        issueHistoryRepository.save(history);

        return getIssue(id);
    }

    public OperationsDtos.IssueDto assignIssue(UUID id, UUID assigneeId, UUID actorId) {
        MaintenanceIssue issue = issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sự cố: " + id));

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy nhân viên được phân công: " + assigneeId));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng: " + actorId));

        issue.setAssignee(assignee);
        issue.setUpdatedAt(Instant.now());
        if (issue.getStatus() == IssueStatus.OPEN) {
            issue.setStatus(IssueStatus.ACCEPTED);
            issueHistoryRepository.save(new IssueStatusHistory(
                    issue, IssueStatus.OPEN, IssueStatus.ACCEPTED, "Phân công xử lý cho " + assignee.getLogin(), actor
            ));
        }
        issueRepository.save(issue);

        return getIssue(id);
    }

    private void validateStatusTransition(IssueStatus current, IssueStatus target, String comment) {
        // Luồng chuẩn: OPEN -> ACCEPTED -> IN_PROGRESS -> RESOLVED -> CLOSED
        // Hoặc mở lại từ RESOLVED -> IN_PROGRESS (cần lý do - BR-127)
        // Hoặc CLOSED từ RESOLVED (xác nhận hoặc đóng có lý do - BR-128)
        // Hoặc hủy/đóng từ OPEN/ACCEPTED nếu quản lý đóng kèm lý do
        boolean valid = switch (current) {
            case OPEN -> (target == IssueStatus.ACCEPTED || target == IssueStatus.CLOSED);
            case ACCEPTED -> (target == IssueStatus.IN_PROGRESS || target == IssueStatus.CLOSED);
            case IN_PROGRESS -> (target == IssueStatus.RESOLVED || target == IssueStatus.CLOSED);
            case RESOLVED -> (target == IssueStatus.CLOSED || target == IssueStatus.IN_PROGRESS);
            case CLOSED -> false; // CLOSED là trạng thái kết thúc, không chuyển tiếp
        };

        if (!valid) {
            throw new ConflictException("Chuyển trạng thái sự cố từ " + current + " sang " + target + " không hợp lệ (BR-126)");
        }

        // Mở lại từ RESOLVED về IN_PROGRESS cần lý do (BR-127)
        if (current == IssueStatus.RESOLVED && target == IssueStatus.IN_PROGRESS) {
            if (comment == null || comment.trim().isBlank()) {
                throw new IllegalArgumentException("Yêu cầu mở lại sự cố phải nêu rõ lý do (BR-127)");
            }
        }

        // Đóng sự cố trực tiếp từ trạng thái chưa xong cần lý do (BR-128)
        if (target == IssueStatus.CLOSED && current != IssueStatus.RESOLVED) {
            if (comment == null || comment.trim().isBlank()) {
                throw new IllegalArgumentException("Đóng sự cố chưa qua kiểm tra RESOLVED cần ghi rõ lý do (BR-128)");
            }
        }
    }

    // ==========================================
    // INVOICE FEEDBACK (BR-123, BR-124)
    // ==========================================

    public OperationsDtos.FeedbackDto createFeedback(UUID invoiceId, OperationsDtos.CreateFeedbackRequest req, UUID actorId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy hóa đơn: " + invoiceId));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng: " + actorId));

        InvoiceFeedback feedback = new InvoiceFeedback(invoice, actor, req.message());
        InvoiceFeedback savedFeedback = feedbackRepository.save(feedback);

        return toFeedbackDto(savedFeedback, Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<OperationsDtos.FeedbackDto> listFeedbacksByInvoice(UUID invoiceId) {
        List<InvoiceFeedback> list = feedbackRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId);
        return list.stream().map(fb -> {
            List<InvoiceFeedbackReply> replies = feedbackReplyRepository.findByFeedbackIdOrderByCreatedAtAsc(fb.getId());
            List<OperationsDtos.FeedbackReplyDto> replyDtos = replies.stream().map(this::toReplyDto).toList();
            return toFeedbackDto(fb, replyDtos);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<OperationsDtos.FeedbackDto> listAllFeedbacks() {
        List<InvoiceFeedback> list = feedbackRepository.findAllByOrderByCreatedAtDesc();
        return list.stream().map(fb -> {
            List<InvoiceFeedbackReply> replies = feedbackReplyRepository.findByFeedbackIdOrderByCreatedAtAsc(fb.getId());
            List<OperationsDtos.FeedbackReplyDto> replyDtos = replies.stream().map(this::toReplyDto).toList();
            return toFeedbackDto(fb, replyDtos);
        }).toList();
    }

    public OperationsDtos.FeedbackDto replyFeedback(UUID feedbackId, OperationsDtos.ReplyFeedbackRequest req, UUID actorId) {
        InvoiceFeedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phản hồi: " + feedbackId));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng: " + actorId));

        InvoiceFeedbackReply reply = new InvoiceFeedbackReply(feedback, actor, req.message());
        feedbackReplyRepository.save(reply);

        // Tự động chuyển OPEN -> IN_REVIEW khi có phản hồi trao đổi
        if (feedback.getStatus() == FeedbackStatus.OPEN) {
            feedback.setStatus(FeedbackStatus.IN_REVIEW);
            feedback.setUpdatedAt(Instant.now());
            feedbackRepository.save(feedback);
        }

        List<InvoiceFeedbackReply> replies = feedbackReplyRepository.findByFeedbackIdOrderByCreatedAtAsc(feedbackId);
        List<OperationsDtos.FeedbackReplyDto> replyDtos = replies.stream().map(this::toReplyDto).toList();
        return toFeedbackDto(feedback, replyDtos);
    }

    public OperationsDtos.FeedbackDto updateFeedbackStatus(UUID feedbackId, FeedbackStatus newStatus, UUID actorId) {
        InvoiceFeedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phản hồi: " + feedbackId));

        feedback.setStatus(newStatus);
        feedback.setUpdatedAt(Instant.now());
        InvoiceFeedback saved = feedbackRepository.save(feedback);

        List<InvoiceFeedbackReply> replies = feedbackReplyRepository.findByFeedbackIdOrderByCreatedAtAsc(feedbackId);
        List<OperationsDtos.FeedbackReplyDto> replyDtos = replies.stream().map(this::toReplyDto).toList();
        return toFeedbackDto(saved, replyDtos);
    }

    // ==========================================
    // STORED FILES & IMAGES (BR-130, BR-131, BR-132)
    // ==========================================

    public OperationsDtos.StoredFileDto storeFile(MultipartFile file, ParentType parentType, UUID parentId, UUID uploaderId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Tệp tải lên không được để trống");
        }

        // BR-131: Kích thước tối đa 5MB
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Dung lượng tệp vượt quá giới hạn 5 MB (BR-131)");
        }

        // BR-131: Kiểm tra MIME content-type khai báo
        String declaredContentType = file.getContentType();
        if (declaredContentType == null || !ALLOWED_MIME_TYPES.contains(declaredContentType.toLowerCase())) {
            throw new IllegalArgumentException("Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WebP (BR-131)");
        }

        // BR-131: Kiểm tra nội dung nhị phân thực (Magic numbers)
        String verifiedMimeType = verifyMagicNumbers(file);
        if (verifiedMimeType == null || !ALLOWED_MIME_TYPES.contains(verifiedMimeType)) {
            throw new IllegalArgumentException("Nội dung tệp thực tế không phải ảnh JPEG, PNG hoặc WebP hợp lệ (BR-131)");
        }

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng tải lên: " + uploaderId));

        String extension = switch (verifiedMimeType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".bin";
        };

        String storageFileName = UUID.randomUUID() + extension;
        Path targetPath = this.storageDirectory.resolve(storageFileName).normalize();

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi lưu trữ tệp tin vào đĩa: " + e.getMessage(), e);
        }

        StoredFile storedFile = new StoredFile(
                storageFileName,
                file.getOriginalFilename() != null ? file.getOriginalFilename() : storageFileName,
                verifiedMimeType,
                file.getSize(),
                uploader,
                parentType,
                parentId
        );
        StoredFile saved = storedFileRepository.save(storedFile);

        return toStoredFileDto(saved);
    }

    @Transactional(readOnly = true)
    public StoredFile getStoredFileMetadata(UUID id) {
        return storedFileRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tệp đính kèm: " + id));
    }

    @Transactional(readOnly = true)
    public byte[] getFileContent(UUID id) {
        StoredFile fileMeta = getStoredFileMetadata(id);
        Path filePath = this.storageDirectory.resolve(fileMeta.getStorageKey()).normalize();
        if (!Files.exists(filePath)) {
            throw new EntityNotFoundException("Tệp tin không tồn tại trên hệ thống lưu trữ");
        }
        try {
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Không thể đọc tệp tin: " + e.getMessage(), e);
        }
    }

    private String verifyMagicNumbers(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int read = is.read(header);
            if (read < 4) return null;

            // JPEG: FF D8 FF
            if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
                return "image/jpeg";
            }

            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (read >= 8 &&
                    (header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                    header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) {
                return "image/png";
            }

            // WebP: RIFF .... WEBP
            if (read >= 12 &&
                    header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
                    header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
                return "image/webp";
            }

            return null;
        } catch (IOException e) {
            return null;
        }
    }

    // ==========================================
    // MAPPERS
    // ==========================================

    private OperationsDtos.IssueDto toIssueDto(MaintenanceIssue issue, List<UUID> fileIds, List<OperationsDtos.IssueStatusHistoryDto> history) {
        String buildingName = "";
        if (issue.getRoom().getBuilding() != null) {
            buildingName = issue.getRoom().getBuilding().getName();
        } else if (issue.getRoom().getFloor() != null && issue.getRoom().getFloor().getBuilding() != null) {
            buildingName = issue.getRoom().getFloor().getBuilding().getName();
        }

        return new OperationsDtos.IssueDto(
                issue.getId(),
                issue.getContract().getId(),
                issue.getRoom().getId(),
                issue.getRoom().getRoomNumber(),
                buildingName,
                issue.getTitle(),
                issue.getDescription(),
                issue.getStatus(),
                issue.getAssignee() != null ? issue.getAssignee().getId() : null,
                issue.getAssignee() != null ? issue.getAssignee().getLogin() : null,
                issue.getCreatedBy().getId(),
                issue.getCreatedBy().getLogin(),
                issue.getCreatedAt(),
                issue.getUpdatedAt(),
                fileIds,
                history
        );
    }

    private OperationsDtos.IssueStatusHistoryDto toHistoryDto(IssueStatusHistory h) {
        return new OperationsDtos.IssueStatusHistoryDto(
                h.getId(),
                h.getOldStatus(),
                h.getNewStatus(),
                h.getComment(),
                h.getActor().getId(),
                h.getActor().getLogin(),
                h.getCreatedAt()
        );
    }

    private OperationsDtos.FeedbackDto toFeedbackDto(InvoiceFeedback fb, List<OperationsDtos.FeedbackReplyDto> replies) {
        return new OperationsDtos.FeedbackDto(
                fb.getId(),
                fb.getInvoice().getId(),
                "INV-" + fb.getInvoice().getBillingMonth(),
                fb.getCreatedBy().getId(),
                fb.getCreatedBy().getLogin(),
                fb.getMessage(),
                fb.getStatus(),
                fb.getCreatedAt(),
                fb.getUpdatedAt(),
                replies
        );
    }

    private OperationsDtos.FeedbackReplyDto toReplyDto(InvoiceFeedbackReply r) {
        return new OperationsDtos.FeedbackReplyDto(
                r.getId(),
                r.getFeedback().getId(),
                r.getActor().getId(),
                r.getActor().getLogin(),
                r.getMessage(),
                r.getCreatedAt()
        );
    }

    private OperationsDtos.StoredFileDto toStoredFileDto(StoredFile sf) {
        return new OperationsDtos.StoredFileDto(
                sf.getId(),
                sf.getOriginalName(),
                sf.getMimeType(),
                sf.getSize(),
                sf.getParentType(),
                sf.getParentId(),
                sf.getCreatedAt()
        );
    }
}
