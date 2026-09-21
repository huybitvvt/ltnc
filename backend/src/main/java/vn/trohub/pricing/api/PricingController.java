package vn.trohub.pricing.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.pricing.api.dto.PricingDtos.*;
import vn.trohub.pricing.application.PricingService;
import vn.trohub.pricing.domain.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class PricingController {

    private final PricingService pricingService;

    public PricingController(PricingService pricingService) {
        this.pricingService = pricingService;
    }

    // ----------------------------------------------------
    // SERVICE DEFINITIONS
    // ----------------------------------------------------
    @GetMapping("/services")
    public ApiResponse<List<ServiceDefinitionResponse>> listServices() {
        List<ServiceDefinitionResponse> list = pricingService.listActiveServices().stream()
                .map(this::toServiceResponse)
                .toList();
        return ApiResponse.of(list);
    }

    @PostMapping("/services")
    public ResponseEntity<ApiResponse<ServiceDefinitionResponse>> createService(
            @Valid @RequestBody CreateServiceRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        ServiceDefinition created = pricingService.createService(req.name(), req.unit(), req.calculationType(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(toServiceResponse(created)));
    }

    // ----------------------------------------------------
    // TARIFFS
    // ----------------------------------------------------
    @GetMapping("/buildings/{id}/tariffs")
    public ApiResponse<List<TariffResponse>> listTariffs(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<TariffResponse> list = pricingService.listTariffsByBuilding(id, actor).stream()
                .map(this::toTariffResponse)
                .toList();
        return ApiResponse.of(list);
    }

    @PostMapping("/buildings/{id}/tariffs")
    public ResponseEntity<ApiResponse<TariffResponse>> createTariff(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTariffRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        Tariff tariff = pricingService.createTariff(id, req.serviceId(), req.effectiveMonth(), req.unitPrice(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(toTariffResponse(tariff)));
    }

    // ----------------------------------------------------
    // BILLING SETTINGS
    // ----------------------------------------------------
    @GetMapping("/buildings/{id}/billing-settings")
    public ApiResponse<BuildingBillingSettingsResponse> getBillingSettings(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        BuildingBillingSettings settings = pricingService.getOrCreateSettings(id, actor);
        return ApiResponse.of(toSettingsResponse(settings));
    }

    @PutMapping("/buildings/{id}/billing-settings")
    public ApiResponse<BuildingBillingSettingsResponse> updateBillingSettings(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBuildingBillingSettingsRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        BuildingBillingSettings updated = pricingService.updateSettings(
                id, req.dueDays(), req.waterAbsoluteThreshold(), req.electricityAbsoluteThreshold(), actor);
        return ApiResponse.of(toSettingsResponse(updated));
    }

    // ----------------------------------------------------
    // CONTRACT SERVICE SUBSCRIPTIONS
    // ----------------------------------------------------
    @GetMapping("/contracts/{id}/services")
    public ApiResponse<List<SubscriptionResponse>> listSubscriptions(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<SubscriptionResponse> list = pricingService.listSubscriptions(id, actor).stream()
                .map(this::toSubscriptionResponse)
                .toList();
        return ApiResponse.of(list);
    }

    @PostMapping("/contracts/{id}/services")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> subscribeService(
            @PathVariable UUID id,
            @Valid @RequestBody CreateSubscriptionRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        ContractServiceSubscription sub = pricingService.subscribeService(
                id, req.serviceId(), req.startMonth(), req.endMonthExclusive(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(toSubscriptionResponse(sub)));
    }

    // ----------------------------------------------------
    // ONE OFF CHARGES
    // ----------------------------------------------------
    @GetMapping("/contracts/{id}/one-off-charges")
    public ApiResponse<List<OneOffChargeResponse>> listOneOffCharges(
            @PathVariable UUID id,
            @RequestParam(required = false) String billingMonth,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<OneOffChargeResponse> list = pricingService.listOneOffCharges(id, billingMonth, actor).stream()
                .map(this::toChargeResponse)
                .toList();
        return ApiResponse.of(list);
    }

    @PostMapping("/contracts/{id}/one-off-charges")
    public ResponseEntity<ApiResponse<OneOffChargeResponse>> createOneOffCharge(
            @PathVariable UUID id,
            @Valid @RequestBody CreateOneOffChargeRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        OneOffCharge charge = pricingService.createOneOffCharge(
                id, req.billingMonth(), req.label(), req.amount(), req.reason(), req.sourceRef(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(toChargeResponse(charge)));
    }

    // ----------------------------------------------------
    // MAPPERS
    // ----------------------------------------------------
    private ServiceDefinitionResponse toServiceResponse(ServiceDefinition s) {
        return new ServiceDefinitionResponse(s.getId(), s.getName(), s.getUnit(), s.getCalculationType(), s.isActive());
    }

    private TariffResponse toTariffResponse(Tariff t) {
        return new TariffResponse(
                t.getId(),
                t.getBuilding().getId(),
                t.getService().getId(),
                t.getService().getName(),
                t.getService().getUnit(),
                t.getService().getCalculationType(),
                t.getEffectiveMonth(),
                t.getUnitPrice()
        );
    }

    private BuildingBillingSettingsResponse toSettingsResponse(BuildingBillingSettings s) {
        return new BuildingBillingSettingsResponse(
                s.getBuilding().getId(),
                s.getDueDays(),
                s.getWaterAbsoluteThreshold(),
                s.getElectricityAbsoluteThreshold()
        );
    }

    private SubscriptionResponse toSubscriptionResponse(ContractServiceSubscription sub) {
        return new SubscriptionResponse(
                sub.getId(),
                sub.getContract().getId(),
                sub.getService().getId(),
                sub.getService().getName(),
                sub.getService().getUnit(),
                sub.getStartMonth(),
                sub.getEndMonthExclusive()
        );
    }

    private OneOffChargeResponse toChargeResponse(OneOffCharge c) {
        return new OneOffChargeResponse(
                c.getId(),
                c.getContract().getId(),
                c.getBillingMonth(),
                c.getLabel(),
                c.getAmount(),
                c.getReason(),
                c.getSourceRef()
        );
    }
}
