package vn.trohub.tenancy.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.tenancy.domain.TenantProfile;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantProfileRepository extends JpaRepository<TenantProfile, UUID> {

    Optional<TenantProfile> findByUserId(UUID userId);

    Optional<TenantProfile> findByPhone(String phone);

    @Query("SELECT t FROM TenantProfile t WHERE " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(t.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "t.phone LIKE CONCAT('%', :query, '%') OR " +
           "t.citizenIdMasked LIKE CONCAT('%', :query, '%'))")
    Page<TenantProfile> searchTenants(@Param("query") String query, Pageable pageable);

    String STAFF_SCOPE = "(EXISTS (SELECT c.id FROM Contract c WHERE " +
            "(c.representativeTenant = t OR EXISTS (SELECT m.id FROM ContractMember m WHERE m.contract = c AND m.tenant = t)) " +
            "AND EXISTS (SELECT a.id FROM BuildingStaffAssignment a WHERE a.building = c.room.building AND a.user.id = :actor)) " +
            "OR (t.createdBy = :actor AND NOT EXISTS (SELECT c.id FROM Contract c WHERE c.representativeTenant = t " +
            "OR EXISTS (SELECT m.id FROM ContractMember m WHERE m.contract = c AND m.tenant = t))))";

    @Query("SELECT t FROM TenantProfile t WHERE " + STAFF_SCOPE +
            " AND (:query IS NULL OR :query = '' OR LOWER(t.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR t.phone LIKE CONCAT('%', :query, '%'))")
    Page<TenantProfile> searchInStaffScope(@Param("query") String query, @Param("actor") UUID actor, Pageable pageable);

    @Query("SELECT count(t) > 0 FROM TenantProfile t WHERE t.id = :id AND " + STAFF_SCOPE)
    boolean inStaffScope(@Param("id") UUID id, @Param("actor") UUID actor);
}
