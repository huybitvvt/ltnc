package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.InvoiceLedgerEntry;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceLedgerEntryRepository extends JpaRepository<InvoiceLedgerEntry, UUID> {

    List<InvoiceLedgerEntry> findByInvoiceIdOrderByRecordedAtAsc(UUID invoiceId);

    List<InvoiceLedgerEntry> findByContractIdOrderByRecordedAtDesc(UUID contractId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM InvoiceLedgerEntry e WHERE e.invoice.id = :invoiceId")
    BigDecimal sumAmountByInvoiceId(@Param("invoiceId") UUID invoiceId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM InvoiceLedgerEntry e WHERE e.contract.id = :contractId")
    BigDecimal sumAmountByContractId(@Param("contractId") UUID contractId);
}
