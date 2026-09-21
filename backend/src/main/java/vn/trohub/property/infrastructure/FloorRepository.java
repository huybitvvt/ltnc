package vn.trohub.property.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.property.domain.Floor;

import java.util.List;
import java.util.UUID;

@Repository
public interface FloorRepository extends JpaRepository<Floor, UUID> {
    List<Floor> findByBuildingIdOrderByFloorOrderAsc(UUID buildingId);
    boolean existsByBuildingIdAndFloorOrder(UUID buildingId, int floorOrder);
}
