package vn.trohub.operations.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos;
import vn.trohub.operations.application.OperationsService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class FeedbackController {

    private final OperationsService operationsService;

    public FeedbackController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping("/invoices/{id}/feedback")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<List<OperationsDtos.FeedbackDto>>> getInvoiceFeedbacks(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<OperationsDtos.FeedbackDto> result = operationsService.listFeedbacksByInvoice(id);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/invoices/{id}/feedback")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<OperationsDtos.FeedbackDto>> createInvoiceFeedback(
            @PathVariable UUID id,
            @Valid @RequestBody OperationsDtos.CreateFeedbackRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.FeedbackDto result = operationsService.createFeedback(id, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    @GetMapping("/feedback")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<OperationsDtos.FeedbackDto>>> getAllFeedbacks(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<OperationsDtos.FeedbackDto> result = operationsService.listAllFeedbacks();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/feedback/{id}/replies")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<OperationsDtos.FeedbackDto>> replyInvoiceFeedback(
            @PathVariable UUID id,
            @Valid @RequestBody OperationsDtos.ReplyFeedbackRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.FeedbackDto result = operationsService.replyFeedback(id, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    @PutMapping("/feedback/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<OperationsDtos.FeedbackDto>> updateFeedbackStatus(
            @PathVariable UUID id,
            @Valid @RequestBody OperationsDtos.UpdateFeedbackStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.FeedbackDto result = operationsService.updateFeedbackStatus(id, request.status(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
