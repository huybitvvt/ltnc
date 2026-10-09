package vn.trohub.property.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {
    List<Room> findByBuildingIdOrderByRoomNumberAsc(UUID buildingId);
    List<Room> findByBuildingIdAndStatusOrderByRoomNumberAsc(UUID buildingId, RoomStatus status);
    List<Room> findByFloorIdOrderByRoomNumberAsc(UUID floorId);
    boolean existsByBuildingIdAndRoomNumber(UUID buildingId, String roomNumber);

    @Query("SELECT r FROM Room r JOIN FETCH r.building LEFT JOIN FETCH r.floor WHERE r.id = :id")
    Optional<Room> findByIdWithDetails(@Param("id") UUID id);

    long countByBuildingId(UUID buildingId);
    long countByBuildingIdAndStatus(UUID buildingId, RoomStatus status);

    @Query("SELECT r FROM Room r WHERE (:buildingId IS NULL OR r.building.id = :buildingId)")
    List<Room> findRoomsForBuilding(@Param("buildingId") UUID buildingId);
}
