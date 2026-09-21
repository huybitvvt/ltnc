package vn.trohub.tenancy.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.tenancy.domain.ContractEvent;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractEventRepository extends JpaRepository<ContractEvent, UUID> {

    List<ContractEvent> findByContractIdOrderByCreatedAtDesc(UUID contractId);
}
