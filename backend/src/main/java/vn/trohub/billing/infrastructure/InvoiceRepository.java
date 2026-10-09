package vn.trohub.billing.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.Invoice;
import vn.trohub.billing.domain.InvoiceStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByContractIdAndBillingMonth(UUID contractId, String billingMonth);

    @Query("SELECT i FROM Invoice i WHERE " +
           "(:contractId IS NULL OR i.contract.id = :contractId) AND " +
           "(:buildingId IS NULL OR i.contract.room.floor.building.id = :buildingId) AND " +
           "(:billingMonth IS NULL OR i.billingMonth = :billingMonth) AND " +
           "(:status IS NULL OR i.status = :status)")
    Page<Invoice> searchInvoices(
            @Param("contractId") UUID contractId,
            @Param("buildingId") UUID buildingId,
            @Param("billingMonth") String billingMonth,
            @Param("status") InvoiceStatus status,
            Pageable pageable
    );

    @Query("SELECT i FROM Invoice i WHERE i.contract.id IN :contractIds AND " +
           "(:buildingId IS NULL OR i.contract.room.floor.building.id = :buildingId) AND " +
           "(:billingMonth IS NULL OR i.billingMonth = :billingMonth) AND " +
           "(:status IS NULL OR i.status = :status)")
    Page<Invoice> searchInvoicesByContracts(
            @Param("contractIds") List<UUID> contractIds,
            @Param("buildingId") UUID buildingId,
            @Param("billingMonth") String billingMonth,
            @Param("status") InvoiceStatus status,
            Pageable pageable
    );

    List<Invoice> findByContractIdOrderByBillingMonthAsc(UUID contractId);

    @Query("SELECT i FROM Invoice i WHERE " +
           "i.status = vn.trohub.billing.domain.InvoiceStatus.ISSUED AND " +
           "(:buildingId IS NULL OR i.contract.room.building.id = :buildingId) AND " +
           "(:billingMonth IS NULL OR i.billingMonth = :billingMonth)")
    List<Invoice> findIssuedInvoicesForDashboard(
            @Param("buildingId") UUID buildingId,
            @Param("billingMonth") String billingMonth
    );
}
