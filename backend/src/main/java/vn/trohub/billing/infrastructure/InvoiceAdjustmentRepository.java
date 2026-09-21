package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.InvoiceAdjustment;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceAdjustmentRepository extends JpaRepository<InvoiceAdjustment, UUID> {
    List<InvoiceAdjustment> findByInvoiceIdOrderByRecordedAtAsc(UUID invoiceId);
}
