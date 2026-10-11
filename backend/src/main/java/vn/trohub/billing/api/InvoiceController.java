package vn.trohub.billing.api;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.billing.api.dto.BillingDtos.*;
import vn.trohub.billing.application.BillingService;
import vn.trohub.billing.domain.InvoiceStatus;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    private final BillingService billingService;

    public InvoiceController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InvoiceSummaryResponse>>> listInvoices(
            @RequestParam(required = false) UUID contractId,
            @RequestParam(required = false) UUID buildingId,
            @RequestParam(required = false) String billingMonth,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal user) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<InvoiceSummaryResponse> result = billingService.listInvoices(contractId, buildingId, billingMonth, status, pageRequest, user);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<InvoiceDetailResponse>> previewInvoice(
            @Valid @RequestBody InvoicePreviewRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceDetailResponse response = billingService.previewInvoice(request.contractId(), request.billingMonth(), user);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<InvoiceDetailResponse>> createOrRecalculateDraft(
            @Valid @RequestBody InvoicePreviewRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceDetailResponse response = billingService.createOrRecalculateDraftInvoice(request.contractId(), request.billingMonth(), user);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceDetailResponse>> getInvoice(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceDetailResponse response = billingService.getInvoice(id, user);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<ApiResponse<InvoiceDetailResponse>> issueInvoice(
            @PathVariable UUID id,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceDetailResponse response = billingService.issueInvoice(id, idempotencyKey, user);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/adjust")
    public ResponseEntity<ApiResponse<InvoiceDetailResponse>> adjustInvoice(
            @PathVariable UUID id,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody AdjustInvoiceRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceDetailResponse response = billingService.adjustInvoice(
                id,
                request.deltaAmount(),
                request.reason(),
                request.effectiveDate(),
                idempotencyKey,
                user
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<ApiResponse<Map<String, String>>> addNote(
            @PathVariable UUID id,
            @Valid @RequestBody AddInvoiceNoteRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        billingService.addInvoiceNote(id, request.content(), request.reason(), user);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Thêm ghi chú đính chính thành công")));
    }
}
