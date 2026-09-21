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
}
