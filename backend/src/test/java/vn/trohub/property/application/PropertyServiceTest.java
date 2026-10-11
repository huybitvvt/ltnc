package vn.trohub.property.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PropertyServiceTest {

    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private FloorRepository floorRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private BuildingStaffAssignmentRepository assignmentRepository;

    private PropertyService propertyService;

    private final UUID ownerId = UUID.randomUUID();
    private final UserPrincipal ownerPrincipal = new UserPrincipal(ownerId, "owner", UserRole.OWNER, true);

    private final UUID staffId = UUID.randomUUID();
    private final UserPrincipal staffPrincipal = new UserPrincipal(staffId, "staff01", UserRole.STAFF, true);

    @BeforeEach
    void setUp() {
        propertyService = new PropertyService(
                buildingRepository,
                floorRepository,
                roomRepository,
                assignmentRepository
        );
    }

    @Test
    @DisplayName("OWNER có quyền tạo tòa nhà mới")
    void testCreateBuilding_Owner_Success() {
        BuildingRequest req = new BuildingRequest("Nhà trọ Bình An", "123 Giải Phóng");

        when(buildingRepository.save(any(Building.class))).thenAnswer(i -> {
            Building b = i.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        BuildingResponse res = propertyService.createBuilding(req, ownerPrincipal);

        assertNotNull(res);
        assertEquals("Nhà trọ Bình An", res.name());
        assertEquals("123 Giải Phóng", res.address());
        verify(buildingRepository).save(any(Building.class));
    }

    @Test
    @DisplayName("STAFF không được phép tạo tòa nhà mới (ném AccessDeniedException)")
    void testCreateBuilding_Staff_ThrowsAccessDenied() {
        BuildingRequest req = new BuildingRequest("Nhà trọ X", "456 Xã Đàn");

        assertThrows(AccessDeniedException.class, () -> propertyService.createBuilding(req, staffPrincipal));
        verify(buildingRepository, never()).save(any());
    }

    @Test
    @DisplayName("STAFF chỉ lấy danh sách các tòa nhà được phân công")
    void testListBuildings_Staff_OnlyAssigned() {
        UUID b1Id = UUID.randomUUID();
        Building b1 = new Building("Tòa 1", "Địa chỉ 1");
        b1.setId(b1Id);

        when(assignmentRepository.findBuildingIdsByUserId(staffId)).thenReturn(List.of(b1Id));
        when(buildingRepository.findAllById(List.of(b1Id))).thenReturn(List.of(b1));
        when(roomRepository.countByBuildingId(b1Id)).thenReturn(5L);
        when(roomRepository.countByBuildingIdAndStatus(b1Id, RoomStatus.VACANT)).thenReturn(2L);

        List<BuildingResponse> result = propertyService.listBuildings(staffPrincipal);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Tòa 1", result.get(0).name());
        assertEquals(5L, result.get(0).totalRooms());
        assertEquals(2L, result.get(0).vacantRooms());
    }

    @Test
    @DisplayName("STAFF truy cập tòa nhà không được phân công ném AccessDeniedException")
    void testCheckBuildingAccess_Staff_NotAssigned_ThrowsAccessDenied() {
        UUID unassignedBuildingId = UUID.randomUUID();
        when(assignmentRepository.existsByUserIdAndBuildingId(staffId, unassignedBuildingId)).thenReturn(false);

        assertThrows(AccessDeniedException.class,
                () -> propertyService.getBuildingById(unassignedBuildingId, staffPrincipal));
    }

    @Test
    @DisplayName("Tạo phòng trọ mới thành công với giá BigDecimal và số phòng")
    void testCreateRoom_Success() {
        UUID buildingId = UUID.randomUUID();
        Building building = new Building("Tòa A", "Địa chỉ A");
        building.setId(buildingId);

        UUID floorId = UUID.randomUUID();
        Floor floor = new Floor(building, "Tầng 2", 2);
        floor.setId(floorId);

        RoomRequest req = new RoomRequest(
                floorId,
                "P.201",
                new BigDecimal("3500000"),
                new BigDecimal("3500000"),
                new BigDecimal("25.5"),
                2,
                true
        );

        when(buildingRepository.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepository.existsByBuildingIdAndRoomNumber(buildingId, "P.201")).thenReturn(false);
        when(floorRepository.findById(floorId)).thenReturn(Optional.of(floor));
        when(roomRepository.save(any(Room.class))).thenAnswer(i -> {
            Room r = i.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        RoomResponse res = propertyService.createRoom(buildingId, req, ownerPrincipal);

        assertNotNull(res);
        assertEquals("P.201", res.roomNumber());
        assertEquals(new BigDecimal("3500000"), res.basePrice());
        assertEquals(new BigDecimal("3500000"), res.depositAmount());
        assertEquals(RoomStatus.VACANT, res.status());
        assertTrue(res.bookable());
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    @DisplayName("Tạo phòng trùng số phòng trong cùng tòa nhà ném IllegalArgumentException")
    void testCreateRoom_DuplicateRoomNumber_ThrowsException() {
        UUID buildingId = UUID.randomUUID();
        Building building = new Building("Tòa A", "Địa chỉ A");
        building.setId(buildingId);

        RoomRequest req = new RoomRequest(
                null,
                "P.101",
                new BigDecimal("3000000"),
                new BigDecimal("3000000"),
                null,
                2,
                true
        );

        when(buildingRepository.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepository.existsByBuildingIdAndRoomNumber(buildingId, "P.101")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> propertyService.createRoom(buildingId, req, ownerPrincipal));
        verify(roomRepository, never()).save(any());
    }

    @Test
    @DisplayName("Khóa/Mở trạng thái cho thuê (bookable) của phòng trọ")
    void testSetRoomBookable_Success() {
        UUID roomId = UUID.randomUUID();
        Building building = new Building("Tòa A", "Địa chỉ A");
        building.setId(UUID.randomUUID());

        Room room = new Room(building, null, "P.101", new BigDecimal("3000000"), new BigDecimal("3000000"));
        room.setId(roomId);
        room.setBookable(true);

        when(roomRepository.findByIdWithDetails(roomId)).thenReturn(Optional.of(room));
        when(roomRepository.save(any(Room.class))).thenAnswer(i -> i.getArgument(0));

        RoomResponse res = propertyService.setRoomBookable(roomId, false, ownerPrincipal);

        assertNotNull(res);
        assertFalse(res.bookable());
        verify(roomRepository).save(room);
    }

    @Test
    void floorFromAnotherBuildingIsRejectedOnCreateAndUpdate() {
        Building building = new Building("A", "A"); building.setId(UUID.randomUUID());
        Building other = new Building("B", "B"); other.setId(UUID.randomUUID());
        Floor foreign = new Floor(other, "1", 1); foreign.setId(UUID.randomUUID());
        Room room = new Room(building, null, "101", BigDecimal.ONE, BigDecimal.ONE); room.setId(UUID.randomUUID());
        RoomRequest request = new RoomRequest(foreign.getId(), "101", BigDecimal.ONE, BigDecimal.ONE, null, 2, true);
        when(buildingRepository.findById(building.getId())).thenReturn(Optional.of(building));
        when(floorRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        when(roomRepository.findByIdWithDetails(room.getId())).thenReturn(Optional.of(room));
        assertThrows(IllegalArgumentException.class, () -> propertyService.createRoom(building.getId(), request, ownerPrincipal));
        assertThrows(IllegalArgumentException.class, () -> propertyService.updateRoom(room.getId(), request, ownerPrincipal));
        verify(roomRepository, never()).save(any());
    }

    @Test
    void staffCannotCreateFloorEvenInAssignedBuilding() {
        assertThrows(AccessDeniedException.class, () -> propertyService.createFloor(UUID.randomUUID(), new FloorRequest("1", 1), staffPrincipal));
        verify(floorRepository, never()).save(any());
    }

    @Test
    void staffCannotEditBuilding() {
        assertThrows(AccessDeniedException.class, () -> propertyService.updateBuilding(UUID.randomUUID(), new BuildingRequest("A", "B"), staffPrincipal));
        verify(buildingRepository, never()).save(any());
    }
}
