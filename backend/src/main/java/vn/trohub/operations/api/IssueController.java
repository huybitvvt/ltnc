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
import vn.trohub.operations.domain.IssueStatus;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/issues")
public class IssueController {

    private final OperationsService operationsService;

    public IssueController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<OperationsDtos.IssueDto>> createIssue(
            @Valid @RequestBody OperationsDtos.CreateIssueRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.IssueDto result = operationsService.createIssue(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<OperationsDtos.IssueDto>> getIssue(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.IssueDto result = operationsService.getIssue(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<List<OperationsDtos.IssueDto>>> listIssues(
            @RequestParam(required = false) UUID contractId,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) IssueStatus status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<OperationsDtos.IssueDto> result = operationsService.listIssues(contractId, roomId, status, principal);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<OperationsDtos.IssueDto>> updateIssueStatus(
            @PathVariable UUID id,
            @Valid @RequestBody OperationsDtos.UpdateIssueStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.IssueDto result = operationsService.updateIssueStatus(id, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<OperationsDtos.IssueDto>> assignIssue(
            @PathVariable UUID id,
            @Valid @RequestBody OperationsDtos.AssignIssueRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.IssueDto result = operationsService.assignIssue(id, request.assigneeId(), principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
