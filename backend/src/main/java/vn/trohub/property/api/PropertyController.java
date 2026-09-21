package vn.trohub.property.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.api.dto.PropertyDtos.*;
import vn.trohub.property.application.PropertyService;
import vn.trohub.property.domain.RoomStatus;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    // ==========================================
    // BUILDINGS
    // ==========================================

    @GetMapping("/buildings")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<BuildingResponse>>> listBuildings(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<BuildingResponse> response = propertyService.listBuildings(principal);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/buildings")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<BuildingResponse>> createBuilding(
            @Valid @RequestBody BuildingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        BuildingResponse response = propertyService.createBuilding(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/buildings/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<BuildingResponse>> getBuilding(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        var building = propertyService.getBuildingById(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(BuildingResponse.fromEntity(building, 0, 0)));
    }

    @PutMapping("/buildings/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<BuildingResponse>> updateBuilding(
            @PathVariable UUID id,
            @Valid @RequestBody BuildingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        BuildingResponse response = propertyService.updateBuilding(id, request, principal);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/buildings/{id}/active")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Void>> toggleBuildingActive(
            @PathVariable UUID id,
            @RequestParam boolean active,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        propertyService.toggleBuildingActive(id, active, principal);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ==========================================
    // FLOORS
    // ==========================================

    @GetMapping("/buildings/{id}/floors")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<FloorResponse>>> listFloors(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<FloorResponse> floors = propertyService.listFloors(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(floors));
    }

    @PostMapping("/buildings/{id}/floors")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<FloorResponse>> createFloor(
            @PathVariable UUID id,
            @Valid @RequestBody FloorRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        FloorResponse floor = propertyService.createFloor(id, request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(floor));
    }

    // ==========================================
    // ROOMS
    // ==========================================

    @GetMapping("/buildings/{id}/rooms")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> listRooms(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID floorId,
            @RequestParam(required = false) RoomStatus status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<RoomResponse> rooms = propertyService.listRooms(id, floorId, status, principal);
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    @PostMapping("/buildings/{id}/rooms")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @PathVariable UUID id,
            @Valid @RequestBody RoomRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = propertyService.createRoom(id, request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(room));
    }

    @GetMapping("/rooms/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoom(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = propertyService.getRoomDetails(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(room));
    }

    @PutMapping("/rooms/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable UUID id,
            @Valid @RequestBody RoomRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = propertyService.updateRoom(id, request, principal);
        return ResponseEntity.ok(ApiResponse.ok(room));
    }

    @PatchMapping("/rooms/{id}/bookable")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<RoomResponse>> setRoomBookable(
            @PathVariable UUID id,
            @RequestBody RoomBookableRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoomResponse room = propertyService.setRoomBookable(id, request.bookable(), principal);
        return ResponseEntity.ok(ApiResponse.ok(room));
    }
}
