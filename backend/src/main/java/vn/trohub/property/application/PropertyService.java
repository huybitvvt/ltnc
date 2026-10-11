package vn.trohub.property.application;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.api.dto.PropertyDtos.*;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;
import vn.trohub.property.infrastructure.BuildingRepository;
import vn.trohub.property.infrastructure.FloorRepository;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PropertyService {

    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final RoomRepository roomRepository;
    private final BuildingStaffAssignmentRepository assignmentRepository;

    public PropertyService(
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            RoomRepository roomRepository,
            BuildingStaffAssignmentRepository assignmentRepository
    ) {
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.roomRepository = roomRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public void checkBuildingAccess(UUID buildingId, UserPrincipal principal) {
        if (principal.getRole() == UserRole.OWNER) {
            return;
        }
        if (principal.getRole() == UserRole.STAFF) {
            boolean hasAccess = assignmentRepository.existsByUserIdAndBuildingId(principal.getId(), buildingId);
            if (!hasAccess) {
                throw new AccessDeniedException("Bạn không được phân công quản lý tòa nhà này");
            }
            return;
        }
        throw new AccessDeniedException("Không có quyền truy cập thông tin tòa nhà");
    }

    public List<BuildingResponse> listBuildings(UserPrincipal principal) {
        List<Building> buildings;
        if (principal.getRole() == UserRole.OWNER) {
            buildings = buildingRepository.findAll();
        } else if (principal.getRole() == UserRole.STAFF) {
            List<UUID> assignedBuildingIds = assignmentRepository.findBuildingIdsByUserId(principal.getId());
            buildings = buildingRepository.findAllById(assignedBuildingIds);
        } else {
            throw new AccessDeniedException("Khách thuê không có quyền xem danh sách tòa nhà quản lý");
        }

        return buildings.stream()
                .map(b -> {
                    long totalRooms = roomRepository.countByBuildingId(b.getId());
                    long vacantRooms = roomRepository.countByBuildingIdAndStatus(b.getId(), RoomStatus.VACANT);
                    return BuildingResponse.fromEntity(b, totalRooms, vacantRooms);
                })
                .collect(Collectors.toList());
    }

    public Building getBuildingById(UUID buildingId, UserPrincipal principal) {
        checkBuildingAccess(buildingId, principal);
        return buildingRepository.findById(buildingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tòa nhà với ID: " + buildingId));
    }

    @Transactional
    public BuildingResponse createBuilding(BuildingRequest request, UserPrincipal principal) {
        if (principal.getRole() != UserRole.OWNER) {
            throw new AccessDeniedException("Chỉ Chủ trọ (OWNER) mới có quyền tạo tòa nhà mới");
        }

        Building building = new Building(request.name().trim(), request.address().trim());
        building = buildingRepository.save(building);
        return BuildingResponse.fromEntity(building, 0, 0);
    }

    @Transactional
    public BuildingResponse updateBuilding(UUID buildingId, BuildingRequest request, UserPrincipal principal) {
        if (!principal.isOwner()) throw new AccessDeniedException("Chỉ OWNER sửa tòa nhà");
        checkBuildingAccess(buildingId, principal);
        Building building = getBuildingById(buildingId, principal);

        building.setName(request.name().trim());
        building.setAddress(request.address().trim());
        building.setUpdatedAt(Instant.now());
        building = buildingRepository.save(building);

        long totalRooms = roomRepository.countByBuildingId(building.getId());
        long vacantRooms = roomRepository.countByBuildingIdAndStatus(building.getId(), RoomStatus.VACANT);
        return BuildingResponse.fromEntity(building, totalRooms, vacantRooms);
    }

    @Transactional
    public void toggleBuildingActive(UUID buildingId, boolean active, UserPrincipal principal) {
        if (principal.getRole() != UserRole.OWNER) {
            throw new AccessDeniedException("Chỉ Chủ trọ (OWNER) mới có quyền thay đổi trạng thái hoạt động của tòa nhà");
        }
        Building building = getBuildingById(buildingId, principal);
        building.setActive(active);
        building.setUpdatedAt(Instant.now());
        buildingRepository.save(building);
    }

    // ==========================================
    // FLOORS
    // ==========================================
    public List<FloorResponse> listFloors(UUID buildingId, UserPrincipal principal) {
        checkBuildingAccess(buildingId, principal);
        return floorRepository.findByBuildingIdOrderByFloorOrderAsc(buildingId)
                .stream()
                .map(FloorResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public FloorResponse createFloor(UUID buildingId, FloorRequest request, UserPrincipal principal) {
        if (!principal.isOwner()) throw new AccessDeniedException("Chỉ OWNER tạo tầng");
        checkBuildingAccess(buildingId, principal);
        Building building = getBuildingById(buildingId, principal);

        int order = request.floorOrder() > 0 ? request.floorOrder() : 1;
        if (floorRepository.existsByBuildingIdAndFloorOrder(buildingId, order)) {
            throw new IllegalArgumentException("Thứ tự tầng " + order + " đã tồn tại trong tòa nhà này");
        }

        Floor floor = new Floor(building, request.name().trim(), order);
        floor = floorRepository.save(floor);
        return FloorResponse.fromEntity(floor);
    }

    // ==========================================
    // ROOMS
    // ==========================================
    public List<RoomResponse> listRooms(UUID buildingId, UUID floorId, RoomStatus status, UserPrincipal principal) {
        checkBuildingAccess(buildingId, principal);

        List<Room> rooms;
        if (status != null) {
            rooms = roomRepository.findByBuildingIdAndStatusOrderByRoomNumberAsc(buildingId, status);
        } else {
            rooms = roomRepository.findByBuildingIdOrderByRoomNumberAsc(buildingId);
        }

        if (floorId != null) {
            rooms = rooms.stream()
                    .filter(r -> r.getFloor() != null && r.getFloor().getId().equals(floorId))
                    .collect(Collectors.toList());
        }

        return rooms.stream().map(RoomResponse::fromEntity).collect(Collectors.toList());
    }

    public RoomResponse getRoomDetails(UUID roomId, UserPrincipal principal) {
        Room room = roomRepository.findByIdWithDetails(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng trọ với ID: " + roomId));

        checkBuildingAccess(room.getBuilding().getId(), principal);
        return RoomResponse.fromEntity(room);
    }

    @Transactional
    public RoomResponse createRoom(UUID buildingId, RoomRequest request, UserPrincipal principal) {
        checkBuildingAccess(buildingId, principal);
        Building building = getBuildingById(buildingId, principal);

        String roomNumber = request.roomNumber().trim();
        if (roomRepository.existsByBuildingIdAndRoomNumber(buildingId, roomNumber)) {
            throw new IllegalArgumentException("Số phòng '" + roomNumber + "' đã tồn tại trong tòa nhà này");
        }

        Floor floor = null;
        if (request.floorId() != null) {
            floor = floorRepository.findById(request.floorId())
                    .orElseThrow(() -> new IllegalArgumentException("Tầng không tồn tại: " + request.floorId()));
            if (!floor.getBuilding().getId().equals(buildingId))
                throw new IllegalArgumentException("Tầng không thuộc tòa nhà của phòng");
        }

        Room room = new Room(building, floor, roomNumber, request.basePrice(), request.depositAmount());
        if (request.area() != null) {
            room.setArea(request.area());
        }
        if (request.maxTenants() != null && request.maxTenants() > 0) {
            room.setMaxTenants(request.maxTenants());
        }
        if (request.bookable() != null) {
            room.setBookable(request.bookable());
        }

        room = roomRepository.save(room);
        return RoomResponse.fromEntity(room);
    }

    @Transactional
    public RoomResponse updateRoom(UUID roomId, RoomRequest request, UserPrincipal principal) {
        Room room = roomRepository.findByIdWithDetails(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng trọ với ID: " + roomId));

        checkBuildingAccess(room.getBuilding().getId(), principal);

        if (!room.getRoomNumber().equalsIgnoreCase(request.roomNumber().trim())) {
            String newRoomNumber = request.roomNumber().trim();
            if (roomRepository.existsByBuildingIdAndRoomNumber(room.getBuilding().getId(), newRoomNumber)) {
                throw new IllegalArgumentException("Số phòng '" + newRoomNumber + "' đã tồn tại trong tòa nhà này");
            }
            room.setRoomNumber(newRoomNumber);
        }

        if (request.floorId() != null) {
            Floor floor = floorRepository.findById(request.floorId())
                    .orElseThrow(() -> new IllegalArgumentException("Tầng không tồn tại: " + request.floorId()));
            if (!floor.getBuilding().getId().equals(room.getBuilding().getId()))
                throw new IllegalArgumentException("Tầng không thuộc tòa nhà của phòng");
            room.setFloor(floor);
        } else room.setFloor(null);

        room.setBasePrice(request.basePrice());
        room.setDepositAmount(request.depositAmount());
        if (request.area() != null) {
            room.setArea(request.area());
        }
        if (request.maxTenants() != null && request.maxTenants() > 0) {
            room.setMaxTenants(request.maxTenants());
        }
        if (request.bookable() != null) {
            room.setBookable(request.bookable());
        }

        room.setUpdatedAt(Instant.now());
        room = roomRepository.save(room);
        return RoomResponse.fromEntity(room);
    }

    @Transactional
    public RoomResponse setRoomBookable(UUID roomId, boolean bookable, UserPrincipal principal) {
        Room room = roomRepository.findByIdWithDetails(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng trọ với ID: " + roomId));

        checkBuildingAccess(room.getBuilding().getId(), principal);

        room.setBookable(bookable);
        room.setUpdatedAt(Instant.now());
        room = roomRepository.save(room);
        return RoomResponse.fromEntity(room);
    }
}
