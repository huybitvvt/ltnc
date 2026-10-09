package vn.trohub.operations.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.operations.domain.InvoiceFeedback;

import java.util.List;
import java.util.UUID;

public interface InvoiceFeedbackRepository extends JpaRepository<InvoiceFeedback, UUID> {
    List<InvoiceFeedback> findByInvoiceIdOrderByCreatedAtDesc(UUID invoiceId);
    List<InvoiceFeedback> findAllByOrderByCreatedAtDesc();
}
