package vn.trohub.tenancy.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Contract c WHERE c.id = :id")
    Optional<Contract> findForUpdate(@Param("id") UUID id);

    Optional<Contract> findByRoomIdAndStatus(UUID roomId, ContractStatus status);

    boolean existsByRoomIdAndStatus(UUID roomId, ContractStatus status);

    List<Contract> findByRepresentativeTenantUserId(UUID userId);

    @Query("SELECT c FROM Contract c " +
           "JOIN c.room r " +
           "JOIN r.building b " +
           "WHERE (:buildingId IS NULL OR b.id = :buildingId) " +
           "AND (:roomId IS NULL OR r.id = :roomId) " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:allowedBuildingIds IS NULL OR b.id IN :allowedBuildingIds) " +
           "ORDER BY c.createdAt DESC")
    Page<Contract> findContracts(
            @Param("buildingId") UUID buildingId,
            @Param("roomId") UUID roomId,
            @Param("status") ContractStatus status,
            @Param("allowedBuildingIds") Collection<UUID> allowedBuildingIds,
            Pageable pageable);

    @Query("SELECT c FROM Contract c " +
           "WHERE c.representativeTenant.user.id = :userId " +
           "AND c.status <> vn.trohub.tenancy.domain.ContractStatus.DRAFT " +
           "ORDER BY c.createdAt DESC")
    Page<Contract> findTenantContracts(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT c FROM Contract c WHERE " +
           "c.status = vn.trohub.tenancy.domain.ContractStatus.ACTIVE AND " +
           "(:buildingId IS NULL OR c.room.building.id = :buildingId)")
    List<Contract> findActiveContractsForBuilding(@Param("buildingId") UUID buildingId);
}
