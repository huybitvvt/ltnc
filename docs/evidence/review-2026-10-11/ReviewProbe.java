import java.lang.reflect.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mockito.MockitoAnnotations;
import static org.mockito.Mockito.*;
import vn.trohub.billing.application.*;
import vn.trohub.billing.api.dto.PaymentDtos.*;
import vn.trohub.billing.api.dto.BillingDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.*;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.ReportingService;
import vn.trohub.tenancy.domain.*;
import vn.trohub.user.domain.*;
import vn.trohub.user.infrastructure.*;

class ReviewProbe {
  static Object fixture(String name) throws Exception {
    var ctor = Class.forName(name).getDeclaredConstructor(); ctor.setAccessible(true);
    var obj = ctor.newInstance(); MockitoAnnotations.openMocks(obj);
    var setup = obj.getClass().getDeclaredMethod("setUp"); setup.setAccessible(true); setup.invoke(obj);
    return obj;
  }
  static <T> T field(Object obj, String name) throws Exception {
    var f = obj.getClass().getDeclaredField(name); f.setAccessible(true); return (T)f.get(obj);
  }
  public static void main(String[] args) throws Exception {
    Object pf = fixture("vn.trohub.billing.application.PaymentServiceTest");
    PaymentService ps = field(pf,"paymentService");
    Invoice invoice = field(pf,"invoiceA");
    TenantProfile profile = field(pf,"tenant");
    User tenant = new User("review_tenant","unused",UserRole.TENANT); tenant.setId(UUID.randomUUID());
    profile.setUser(tenant);
    UserPrincipal principal = new UserPrincipal(tenant.getId(),tenant.getLogin(),tenant.getRole(),true);
    InvoiceRepository ir = field(pf,"invoiceRepository");
    UserRepository ur = field(pf,"userRepository");
    InvoiceLedgerEntryRepository lr = field(pf,"ledgerEntryRepository");
    when(ir.findById(invoice.getId())).thenReturn(Optional.of(invoice));
    when(ur.findById(tenant.getId())).thenReturn(Optional.of(tenant));
    when(lr.sumAmountByInvoiceId(invoice.getId())).thenReturn(new BigDecimal("3000000"));
    ps.recordPayment(new RecordPaymentRequest(invoice.getId(),new BigDecimal("3000000"),PaymentMethod.CASH,null,"review"),principal,"review-tenant-payment");
    verify(lr).save(any(InvoiceLedgerEntry.class));
    System.out.println("TENANT_RECORD_PAYMENT: ACCEPTED_AND_LEDGER_SAVE_CALLED; expected forbidden");

    invoice.setStatus(InvoiceStatus.DRAFT);
    var draftResult = ps.getInvoiceFinancialStatus(invoice.getId(),principal);
    System.out.println("TENANT_DRAFT_FINANCIAL_STATUS: RETURNED; expected not found");

    invoice.setOriginalTotal(BigDecimal.ZERO);
    when(lr.sumAmountByInvoiceId(invoice.getId())).thenReturn(BigDecimal.ZERO);
    var zeroResult = ps.getInvoiceFinancialStatus(invoice.getId(),principal);
    System.out.println("ZERO_INVOICE_STATUS: "+zeroResult.paymentStatus()+"; expected PAID");

    Object rf = fixture("vn.trohub.operations.application.ReportingServiceTest");
    ReportingService rs = field(rf,"reportingService");
    User staff = new User("review_staff","unused",UserRole.STAFF); staff.setId(UUID.randomUUID());
    UserRepository rur = field(rf,"userRepository");
    InvoiceRepository rir = field(rf,"invoiceRepository");
    Contract rc = field(rf,"contract101");
    Invoice reportInvoice = new Invoice(rc,"2026-09",InvoiceStatus.ISSUED,LocalDate.of(2026,9,1),LocalDate.of(2026,10,1),LocalDate.of(2026,10,7));
    reportInvoice.setId(UUID.randomUUID()); reportInvoice.setOriginalTotal(new BigDecimal("9876543"));
    when(rur.findById(staff.getId())).thenReturn(Optional.of(staff));
    when(rir.findIssuedInvoicesForDashboard(null,null)).thenReturn(List.of(reportInvoice));
    var report = rs.getDashboardMetrics(null,null,new UserPrincipal(staff.getId(),staff.getLogin(),staff.getRole(),true));
    BuildingStaffAssignmentRepository assignments = field(rf,"staffAssignmentRepository");
    verifyNoInteractions(assignments);
    System.out.println("STAFF_GLOBAL_DASHBOARD: billedAmount="+report.billedAmount()+"; no assignment check performed");

    Object bf = fixture("vn.trohub.billing.application.BillingServiceTest");
    BillingService bs = field(bf,"billingService");
    Contract bc = field(bf,"contract");
    bc.setActualStartDate(LocalDate.now().withDayOfMonth(1));
    var month = YearMonth.now();
    Invoice currentInvoice = new Invoice(bc,month.toString(),InvoiceStatus.DRAFT,month.atDay(1),month.plusMonths(1).atDay(1),month.plusMonths(1).atDay(7));
    currentInvoice.setId(UUID.randomUUID());
    InvoiceRepository bir = field(bf,"invoiceRepository");
    when(bir.findById(currentInvoice.getId())).thenReturn(Optional.of(currentInvoice));
    when(bir.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));
    InvoiceLedgerEntryRepository blr = field(bf,"ledgerEntryRepository"); when(blr.sumAmountByInvoiceId(currentInvoice.getId())).thenReturn(BigDecimal.ZERO); UserPrincipal owner = field(bf,"ownerPrincipal");
    var issued = bs.issueInvoice(currentInvoice.getId(),null,owner);
    System.out.println("OPEN_MONTH_ISSUE: "+issued.status()+", periodEnd="+issued.periodEndExclusive()+", today="+LocalDate.now()+"; expected rejected");

    var item = new InvoiceItemResponse(null,InvoiceItemType.RENT,"review",BigDecimal.ONE,new BigDecimal("9007199254740993"),new BigDecimal("9007199254740993"),"{}",null,null);
    System.out.println("MONEY_JSON: "+new ObjectMapper().writeValueAsString(item));
    System.out.println("SCOPE: isolated service probes with mocked repositories; not HTTP/PostgreSQL integration tests");
  }
}
