package vn.trohub.tenancy.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.tenancy.domain.ContractMember;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractMemberRepository extends JpaRepository<ContractMember, UUID> {

    List<ContractMember> findByContractIdOrderByJoinedOnAsc(UUID contractId);

    Optional<ContractMember> findByContractIdAndTenantId(UUID contractId, UUID tenantId);

    @Query("SELECT COUNT(m) FROM ContractMember m " +
           "WHERE m.contract.id = :contractId " +
           "AND m.joinedOn <= :date " +
           "AND (m.leftOn IS NULL OR m.leftOn > :date)")
    long countActiveMembersAtDate(@Param("contractId") UUID contractId, @Param("date") LocalDate date);
}
