package vn.trohub.common.security;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import vn.trohub.billing.domain.Invoice;
import vn.trohub.billing.domain.InvoiceStatus;
import vn.trohub.tenancy.domain.Contract;

/** Record-level rules shared by direct and indirect resource endpoints. */
public final class AccessPolicy {
    private AccessPolicy() {}

    public static boolean canRead(Contract contract, UserPrincipal principal) {
        if (principal == null || !principal.isEnabled()) return false;
        if (principal.isTenant()) {
            var representative = contract.getRepresentativeTenant();
            return representative != null && representative.getUser() != null
                    && principal.getId().equals(representative.getUser().getId());
        }
        return principal.hasBuildingScope(contract.getRoom().getBuilding().getId());
    }

    public static void requireContract(Contract contract, UserPrincipal principal) {
        if (!canRead(contract, principal)) throw new AccessDeniedException("Bản ghi ngoài phạm vi được giao");
    }

    public static void requireManager(Contract contract, UserPrincipal principal) {
        if (principal == null || principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được thực hiện thao tác này");
        requireContract(contract, principal);
    }

    public static void requireInvoice(Invoice invoice, UserPrincipal principal) {
        requireContract(invoice.getContract(), principal);
        if (principal.isTenant() && invoice.getStatus() != InvoiceStatus.ISSUED)
            throw new EntityNotFoundException("Không tìm thấy hóa đơn");
    }
}
