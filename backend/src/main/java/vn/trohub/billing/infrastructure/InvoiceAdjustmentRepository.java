package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.InvoiceAdjustment;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceAdjustmentRepository extends JpaRepository<InvoiceAdjustment, UUID> {
    List<InvoiceAdjustment> findByInvoiceIdOrderByRecordedAtAsc(UUID invoiceId);

    @Query("SELECT COALESCE(SUM(a.deltaAmount), 0) FROM InvoiceAdjustment a WHERE a.invoice.id = :invoiceId")
    BigDecimal sumDeltaAmountByInvoiceId(@Param("invoiceId") UUID invoiceId);
}
