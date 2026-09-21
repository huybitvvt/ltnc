package vn.trohub.metering.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.auth.domain.UserPrincipal;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.metering.api.dto.MeteringDtos.*;
import vn.trohub.metering.application.MeteringService;
import vn.trohub.metering.domain.ConsumptionAlert;
import vn.trohub.tenancy.domain.MeterReading;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MeteringController {

    private final MeteringService meteringService;

    public MeteringController(MeteringService meteringService) {
        this.meteringService = meteringService;
    }

    @PostMapping("/meters/readings")
    public ResponseEntity<ApiResponse<MeterReadingResponse>> recordReading(
            @Valid @RequestBody RecordReadingRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        MeterReading reading = meteringService.recordPeriodicReading(
                req.meterId(), req.readingDate(), req.value(), req.fileId(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(toReadingResponse(reading)));
    }

    @PostMapping("/meters/readings/bulk")
    public ApiResponse<List<MeterReadingResponse>> recordBulkReadings(
            @Valid @RequestBody BulkRecordReadingRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<MeterReadingResponse> results = new ArrayList<>();
        for (BulkRecordReadingItem item : req.readings()) {
            MeterReading r = meteringService.recordPeriodicReading(
                    item.meterId(), req.readingDate(), item.value(), null, actor);
            results.add(toReadingResponse(r));
        }
        return ApiResponse.of(results);
    }

    @GetMapping("/rooms/{id}/meter-readings")
    public ApiResponse<List<MeterReadingResponse>> listReadingsByRoom(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<MeterReadingResponse> list = meteringService.listReadingsByRoom(id, actor).stream()
                .map(this::toReadingResponse)
                .toList();
        return ApiResponse.of(list);
    }

    @GetMapping("/contracts/{id}/consumption-alerts")
    public ApiResponse<List<ConsumptionAlertResponse>> listAlerts(
            @PathVariable UUID id,
            @RequestParam(required = false) String billingMonth,
            @AuthenticationPrincipal UserPrincipal actor) {
        List<ConsumptionAlertResponse> list = meteringService.listAlerts(id, billingMonth, actor).stream()
                .map(this::toAlertResponse)
                .toList();
        return ApiResponse.of(list);
    }

    @PutMapping("/consumption-alerts/{id}/acknowledge")
    public ApiResponse<ConsumptionAlertResponse> acknowledgeAlert(
            @PathVariable UUID id,
            @Valid @RequestBody AcknowledgeAlertRequest req,
            @AuthenticationPrincipal UserPrincipal actor) {
        ConsumptionAlert alert = meteringService.acknowledgeAlert(id, req.reason(), actor);
        return ApiResponse.of(toAlertResponse(alert));
    }

    private MeterReadingResponse toReadingResponse(MeterReading r) {
        return new MeterReadingResponse(
                r.getId(),
                r.getMeter().getId(),
                r.getMeter().getType(),
                r.getMeter().getRoom().getCode(),
                r.getReadingDate(),
                r.getValue(),
                r.getKind(),
                r.getFileId(),
                r.getCreatedBy().getLogin(),
                r.getCreatedAt()
        );
    }

    private ConsumptionAlertResponse toAlertResponse(ConsumptionAlert a) {
        return new ConsumptionAlertResponse(
                a.getId(),
                a.getContract().getId(),
                a.getMeterType(),
                a.getBillingMonth(),
                a.getReadingVersion(),
                a.getEvaluationStatus(),
                a.getComparisonSnapshot(),
                a.getAcknowledgedBy() != null ? a.getAcknowledgedBy().getLogin() : null,
                a.getAcknowledgedAt(),
                a.getReason(),
                a.getCreatedAt()
        );
    }
}
