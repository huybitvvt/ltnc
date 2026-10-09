package vn.trohub.operations.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos.DashboardMetricsDto;
import vn.trohub.operations.application.ReportingService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reporting")
public class ReportingController {

    private final ReportingService reportingService;

    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<DashboardMetricsDto>> getDashboardMetrics(
            @RequestParam(required = false) UUID buildingId,
            @RequestParam(required = false) String billingMonth,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        DashboardMetricsDto result = reportingService.getDashboardMetrics(buildingId, billingMonth, principal);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
