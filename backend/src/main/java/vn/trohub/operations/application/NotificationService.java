package vn.trohub.operations.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos.BroadcastNotificationRequest;
import vn.trohub.operations.application.OperationsDtos.NotificationDto;
import vn.trohub.operations.domain.Notification;
import vn.trohub.operations.infrastructure.NotificationRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ContractRepository contractRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               ContractRepository contractRepository,
                               BuildingStaffAssignmentRepository staffAssignmentRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.contractRepository = contractRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> listNotifications(UUID userId, boolean unreadOnly, Pageable pageable) {
        Page<Notification> page = unreadOnly
                ? notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public NotificationDto markAsRead(UUID id, UUID userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy thông báo: " + id));

        if (!notification.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Không có quyền truy cập thông báo này");
        }

        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }
        return mapToDto(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadAtIsNull(userId);
        Instant now = Instant.now();
        for (Notification n : unread) {
            n.setReadAt(now);
        }
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public Optional<NotificationDto> sendNotification(UUID userId,
                                                      String eventKey,
                                                      String type,
                                                      String title,
                                                      String message,
                                                      String resourceType,
                                                      UUID resourceId) {
        // Chống trùng lặp theo BR-136 (event_key deduplication)
        if (notificationRepository.existsByUserIdAndEventKey(userId, eventKey)) {
            log.info("Bỏ qua thông báo trùng lặp: userId={}, eventKey={}", userId, eventKey);
            return Optional.empty();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng: " + userId));

        Notification notification = new Notification(user, eventKey, type, title, message, resourceType, resourceId);
        notification = notificationRepository.save(notification);
        return Optional.of(mapToDto(notification));
    }

    @Transactional
    public int broadcastNotification(BroadcastNotificationRequest req, UserPrincipal actor) {
        User actorUser = userRepository.findById(actor.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người gửi"));

        // Kiểm tra quyền: OWNER hoặc STAFF được phân công quản lý tòa nhà
        if (actorUser.getRole() == UserRole.STAFF) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(actorUser.getId(), req.buildingId());
            if (!assigned) {
                throw new AccessDeniedException("Nhân viên không quản lý tòa nhà này");
            }
        } else if (actorUser.getRole() != UserRole.OWNER) {
            throw new AccessDeniedException("Chỉ chủ trọ hoặc nhân viên mới có quyền phát thông báo");
        }

        // Lấy danh sách hợp đồng ACTIVE thuộc tòa nhà
        List<Contract> activeContracts = contractRepository.findContracts(
                req.buildingId(), null, ContractStatus.ACTIVE, null, Pageable.unpaged()
        ).getContent();

        Set<UUID> recipientUserIds = new HashSet<>();
        for (Contract c : activeContracts) {
            if (c.getRepresentativeTenant() != null && c.getRepresentativeTenant().getUser() != null) {
                recipientUserIds.add(c.getRepresentativeTenant().getUser().getId());
            }
        }

        int count = 0;
        long timestamp = Instant.now().toEpochMilli();
        for (UUID recipientId : recipientUserIds) {
            String eventKey = "BROADCAST-" + req.buildingId() + "-" + timestamp + "-" + recipientId;
            sendNotification(
                    recipientId,
                    eventKey,
                    "BROADCAST",
                    req.title(),
                    req.message(),
                    "BUILDING",
                    req.buildingId()
            );
            count++;
        }
        return count;
    }

    private NotificationDto mapToDto(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getResourceType(),
                n.getResourceId(),
                n.getReadAt(),
                n.getCreatedAt()
        );
    }
}
