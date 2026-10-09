package vn.trohub.operations.api;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.NotificationService;
import vn.trohub.operations.application.OperationsDtos.BroadcastNotificationRequest;
import vn.trohub.operations.application.OperationsDtos.NotificationDto;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<Page<NotificationDto>>> listNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Page<NotificationDto> result = notificationService.listNotifications(principal.getId(), unreadOnly, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        long count = notificationService.getUnreadCount(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", count)));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<NotificationDto>> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        NotificationDto result = notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/read-all")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<Map<String, String>>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        notificationService.markAllAsRead(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "SUCCESS")));
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> broadcastNotification(
            @Valid @RequestBody BroadcastNotificationRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        int sent = notificationService.broadcastNotification(request, principal);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "status", "SUCCESS",
                "buildingId", request.buildingId(),
                "sentCount", sent
        )));
    }
}
