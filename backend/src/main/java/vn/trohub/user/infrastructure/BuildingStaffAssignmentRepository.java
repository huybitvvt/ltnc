package vn.trohub.user.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.trohub.user.domain.BuildingStaffAssignment;

import java.util.List;
import java.util.UUID;

public interface BuildingStaffAssignmentRepository extends JpaRepository<BuildingStaffAssignment, UUID> {
    List<BuildingStaffAssignment> findByUserId(UUID userId);

    @Query("SELECT bsa.building.id FROM BuildingStaffAssignment bsa WHERE bsa.user.id = :userId")
    List<UUID> findBuildingIdsByUserId(@Param("userId") UUID userId);

    boolean existsByUserIdAndBuildingId(UUID userId, UUID buildingId);

    void deleteByUserId(UUID userId);
}
