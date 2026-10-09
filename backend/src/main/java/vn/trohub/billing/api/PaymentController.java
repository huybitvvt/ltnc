package vn.trohub.billing.api;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.billing.api.dto.PaymentDtos.*;
import vn.trohub.billing.application.PaymentService;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/payments/record")
    public ResponseEntity<ApiResponse<InvoiceFinancialStatusResponse>> recordPayment(
            @Valid @RequestBody RecordPaymentRequest request,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceFinancialStatusResponse response = paymentService.recordPayment(request, user, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response, "Ghi nhận thanh toán hóa đơn thành công"));
    }

    @PostMapping("/payments/correct")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<InvoiceFinancialStatusResponse>> correctPayment(
            @Valid @RequestBody PaymentCorrectionRequest request,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceFinancialStatusResponse response = paymentService.correctPayment(request, user, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response, "Đính chính bút toán thu tiền thành công"));
    }

    @PostMapping("/payments/refund")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<InvoiceFinancialStatusResponse>> refundCredit(
            @Valid @RequestBody RefundRequest request,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceFinancialStatusResponse response = paymentService.refundInvoiceCredit(request, user, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response, "Hoàn trả số dư thừa hóa đơn thành công"));
    }

    @PostMapping("/payments/transfer-credit")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<InvoiceFinancialStatusResponse>> transferCredit(
            @Valid @RequestBody TransferCreditRequest request,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceFinancialStatusResponse response = paymentService.transferCredit(request, user, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok(response, "Chuyển bù trừ số dư sang hóa đơn khác thành công"));
    }

    @GetMapping("/invoices/{invoiceId}/financial-status")
    public ResponseEntity<ApiResponse<InvoiceFinancialStatusResponse>> getFinancialStatus(
            @PathVariable UUID invoiceId,
            @AuthenticationPrincipal UserPrincipal user) {
        InvoiceFinancialStatusResponse response = paymentService.getInvoiceFinancialStatus(invoiceId, user);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
