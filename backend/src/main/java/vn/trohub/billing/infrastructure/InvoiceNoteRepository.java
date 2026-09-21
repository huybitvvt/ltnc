package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.InvoiceNote;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceNoteRepository extends JpaRepository<InvoiceNote, UUID> {
    List<InvoiceNote> findByInvoiceIdOrderByRecordedAtAsc(UUID invoiceId);
}
