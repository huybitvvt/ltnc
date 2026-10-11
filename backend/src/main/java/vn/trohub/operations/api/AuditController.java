package vn.trohub.operations.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {
    private final JdbcTemplate jdbc;
    public AuditController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public ApiResponse<List<Map<String, Object>>> list(@AuthenticationPrincipal UserPrincipal caller,
            @RequestParam(required = false) UUID buildingId, @RequestParam(defaultValue = "0") int page) {
        if (page < 0 || page > 1000000) throw new IllegalArgumentException("Trang ngoài phạm vi");
        String scope = caller.isOwner() ? "" : " AND EXISTS (SELECT 1 FROM building_staff_assignments s WHERE s.building_id = a.building_id AND s.user_id = ?)";
        List<Object> parameters = new ArrayList<>();
        if (!caller.isOwner()) parameters.add(caller.getId());
        if (buildingId != null) parameters.add(buildingId);
        parameters.add(page * 50);
        return ApiResponse.of(jdbc.queryForList("SELECT a.id, a.actor_id, a.actor_role, a.action, a.resource_type, a.resource_id, a.building_id, a.reason, a.before_data::text AS before_data, a.after_data::text AS after_data, a.source_ref, a.recorded_at FROM audit_events a WHERE true" + scope
                + (buildingId == null ? "" : " AND a.building_id = ?") + " ORDER BY recorded_at DESC, id DESC LIMIT 50 OFFSET ?", parameters.toArray()));
    }
}
