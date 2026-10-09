package vn.trohub.operations.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.operations.domain.InvoiceFeedbackReply;

import java.util.List;
import java.util.UUID;

public interface InvoiceFeedbackReplyRepository extends JpaRepository<InvoiceFeedbackReply, UUID> {
    List<InvoiceFeedbackReply> findByFeedbackIdOrderByCreatedAtAsc(UUID feedbackId);
}
