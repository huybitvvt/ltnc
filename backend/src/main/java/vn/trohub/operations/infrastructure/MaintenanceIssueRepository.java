package vn.trohub.operations.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.operations.domain.IssueStatus;
import vn.trohub.operations.domain.MaintenanceIssue;

import java.util.List;
import java.util.UUID;

public interface MaintenanceIssueRepository extends JpaRepository<MaintenanceIssue, UUID> {
    List<MaintenanceIssue> findByContractIdOrderByCreatedAtDesc(UUID contractId);
    List<MaintenanceIssue> findByRoomIdOrderByCreatedAtDesc(UUID roomId);
    List<MaintenanceIssue> findByStatusOrderByCreatedAtDesc(IssueStatus status);
    List<MaintenanceIssue> findAllByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM MaintenanceIssue m WHERE " +
           "m.status <> vn.trohub.operations.domain.IssueStatus.CLOSED AND " +
           "(:buildingId IS NULL OR m.room.building.id = :buildingId)")
    long countOpenIssuesForBuilding(@org.springframework.data.repository.query.Param("buildingId") UUID buildingId);
}
