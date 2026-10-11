package vn.trohub.tenancy.api;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.tenancy.api.dto.TenancyDtos.*;
import vn.trohub.tenancy.application.TenancyService;
import vn.trohub.tenancy.domain.ContractStatus;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class TenancyController {

    private final TenancyService tenancyService;
    private final vn.trohub.tenancy.application.CheckoutService checkoutService;

    public TenancyController(TenancyService tenancyService, vn.trohub.tenancy.application.CheckoutService checkoutService) {
        this.tenancyService = tenancyService;
        this.checkoutService = checkoutService;
    }

    // ==========================================
    // TENANTS
    // ==========================================

    @GetMapping("/tenants")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<TenantSummary>>> listTenants(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal actor) {
        Page<TenantSummary> page = tenancyService.searchTenants(query, pageable, actor);
        return ResponseEntity.ok(ApiResponse.ofPage(page));
    }

    @PostMapping("/tenants")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<TenantSummary>> createTenant(
            @Valid @RequestBody CreateTenantRequest request,
            @AuthenticationPrincipal UserPrincipal actor) {
        TenantSummary summary = tenancyService.createTenantProfile(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(summary));
    }

    @GetMapping("/tenants/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<TenantSummary>> getTenant(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal actor) {
        TenantSummary summary = tenancyService.getTenantProfile(id, actor);
        return ResponseEntity.ok(ApiResponse.of(summary));
    }

    @PostMapping("/tenants/{id}/invite")
    public ResponseEntity<ApiResponse<TenantInviteResponse>> issueTenantInvite(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        TenantInviteResponse response = tenancyService.issueTenantInvite(id, actor);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    // ==========================================
    // CONTRACTS
    // ==========================================

    @GetMapping("/contracts")
    public ResponseEntity<ApiResponse<List<ContractSummary>>> listContracts(
            @RequestParam(required = false) UUID buildingId,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) ContractStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal actor) {
        Page<ContractSummary> page = tenancyService.listContracts(buildingId, roomId, status, pageable, actor);
        return ResponseEntity.ok(ApiResponse.ofPage(page));
    }

    @PostMapping("/contracts")
    public ResponseEntity<ApiResponse<ContractSummary>> createContractDraft(
            @Valid @RequestBody CreateContractRequest request,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractSummary summary = tenancyService.createContractDraft(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(summary));
    }

    @GetMapping("/contracts/{id}")
    public ResponseEntity<ApiResponse<ContractSummary>> getContract(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractSummary summary = tenancyService.getContract(id, actor);
        return ResponseEntity.ok(ApiResponse.of(summary));
    }

    @PostMapping("/contracts/{id}/activate")
    public ResponseEntity<ApiResponse<ContractSummary>> activateContract(
            @PathVariable UUID id,
            @Valid @RequestBody ActivateContractRequest request,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractSummary summary = tenancyService.activateContract(id, request, actor);
        return ResponseEntity.ok(ApiResponse.of(summary));
    }

    @PostMapping("/contracts/{id}/extend")
    public ResponseEntity<ApiResponse<ContractSummary>> extendContract(
            @PathVariable UUID id,
            @Valid @RequestBody ExtendContractRequest request,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractSummary summary = tenancyService.extendContract(id, request, actor);
        return ResponseEntity.ok(ApiResponse.of(summary));
    }

    @PostMapping("/contracts/{id}/checkout")
    public ResponseEntity<ApiResponse<ContractSummary>> checkoutContract(
            @PathVariable UUID id,
            @Valid @RequestBody CheckoutContractRequest request,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractSummary summary = checkoutService.checkout(id, request, actor, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.of(summary));
    }

    // ==========================================
    // CONTRACT MEMBERS
    // ==========================================

    @GetMapping("/contracts/{id}/members")
    public ResponseEntity<ApiResponse<List<ContractMemberResponse>>> listMembers(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<ContractMemberResponse> members = tenancyService.listContractMembers(id, actor);
        return ResponseEntity.ok(ApiResponse.of(members));
    }

    @PostMapping("/contracts/{id}/members")
    public ResponseEntity<ApiResponse<ContractMemberResponse>> addMember(
            @PathVariable UUID id,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractMemberResponse member = tenancyService.addContractMember(id, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(member));
    }

    // ==========================================
    // ROOM METERS
    // ==========================================

    @GetMapping("/rooms/{id}/meters")
    public ResponseEntity<ApiResponse<List<RoomMeterResponse>>> getRoomMeters(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<RoomMeterResponse> meters = tenancyService.getRoomMeters(id, actor);
        return ResponseEntity.ok(ApiResponse.of(meters));
    }
}
