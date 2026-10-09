package vn.trohub.operations.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.operations.domain.FeedbackStatus;
import vn.trohub.operations.domain.IssueStatus;
import vn.trohub.operations.domain.ParentType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OperationsDtos {

    private OperationsDtos() {}

    public record CreateIssueRequest(
            @NotNull UUID contractId,
            @NotNull UUID roomId,
            @NotBlank String title,
            @NotBlank String description,
            List<UUID> fileIds
    ) {}

    public record UpdateIssueStatusRequest(
            @NotNull IssueStatus status,
            String comment
    ) {}

    public record AssignIssueRequest(
            @NotNull UUID assigneeId
    ) {}

    public record IssueStatusHistoryDto(
            UUID id,
            IssueStatus oldStatus,
            IssueStatus newStatus,
            String comment,
            UUID actorId,
            String actorName,
            Instant createdAt
    ) {}

    public record IssueDto(
            UUID id,
            UUID contractId,
            UUID roomId,
            String roomCode,
            String buildingName,
            String title,
            String description,
            IssueStatus status,
            UUID assigneeId,
            String assigneeName,
            UUID createdById,
            String createdByName,
            Instant createdAt,
            Instant updatedAt,
            List<UUID> fileIds,
            List<IssueStatusHistoryDto> history
    ) {}

    public record CreateFeedbackRequest(
            @NotBlank String message
    ) {}

    public record ReplyFeedbackRequest(
            @NotBlank String message
    ) {}

    public record UpdateFeedbackStatusRequest(
            @NotNull FeedbackStatus status
    ) {}

    public record FeedbackReplyDto(
            UUID id,
            UUID feedbackId,
            UUID actorId,
            String actorName,
            String message,
            Instant createdAt
    ) {}

    public record FeedbackDto(
            UUID id,
            UUID invoiceId,
            String invoiceCode,
            UUID createdById,
            String createdByName,
            String message,
            FeedbackStatus status,
            Instant createdAt,
            Instant updatedAt,
            List<FeedbackReplyDto> replies
    ) {}

    public record StoredFileDto(
            UUID id,
            String originalName,
            String mimeType,
            Long size,
            ParentType parentType,
            UUID parentId,
            Instant createdAt
    ) {}

    public record NotificationDto(
            UUID id,
            String title,
            String message,
            String type,
            String resourceType,
            UUID resourceId,
            Instant readAt,
            Instant createdAt
    ) {}

    public record BroadcastNotificationRequest(
            @NotNull UUID buildingId,
            @NotBlank String title,
            @NotBlank String message
    ) {}

    public record DashboardMetricsDto(
            UUID buildingId,
            String billingMonth,
            String billedAmount,
            String cashCollected,
            String cashRefunded,
            String netCash,
            String totalDebt,
            String totalCredit,
            String totalDepositHeld,
            int totalRooms,
            int occupiedRooms,
            int vacantBookableRooms,
            int vacantBlockedRooms,
            int openIssuesCount
    ) {}
}
