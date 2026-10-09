package vn.trohub.operations.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.operations.domain.Notification;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<Notification> findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<Notification> findByUserIdAndReadAtIsNull(UUID userId);
    long countByUserIdAndReadAtIsNull(UUID userId);
    boolean existsByUserIdAndEventKey(UUID userId, String eventKey);
}
