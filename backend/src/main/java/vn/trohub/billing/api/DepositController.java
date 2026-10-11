package vn.trohub.billing.api;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.billing.api.dto.DepositDtos.*;
import vn.trohub.billing.application.DepositService;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/deposits")
public class DepositController {

    private final DepositService depositService;

    public DepositController(DepositService depositService) {
        this.depositService = depositService;
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> getContractDepositStatus(
            @PathVariable UUID contractId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.getContractDepositStatus(contractId, principal);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/receipt")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> recordReceipt(
            @Valid @RequestBody RecordDepositReceiptRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.recordDepositReceipt(request, principal, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/correct")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> correctReceipt(
            @Valid @RequestBody CorrectDepositReceiptRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.correctDepositReceipt(request, principal, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refund")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> refundDeposit(
            @Valid @RequestBody RefundDepositRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.refundDeposit(request, principal, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/deduct")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> deductDeposit(
            @Valid @RequestBody DeductDepositRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.deductDeposit(request, principal, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/offset-invoice")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> offsetDepositToInvoice(
            @Valid @RequestBody OffsetDepositToInvoiceRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.offsetDepositToInvoice(request, principal, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/settle")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<ContractDepositFinancialStatusResponse>> settleDeposit(
            @Valid @RequestBody SettleDepositRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContractDepositFinancialStatusResponse response = depositService.settleDeposit(request, principal, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
