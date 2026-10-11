package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.trohub.billing.api.dto.PaymentDtos.RecordPaymentRequest;
import vn.trohub.billing.domain.PaymentMethod;
import vn.trohub.common.money.Money;
import java.math.BigDecimal;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class MoneyContractTest {
    @Test void serializesLargeVndAsExactDecimalString() throws Exception {
        var request = new RecordPaymentRequest(UUID.randomUUID(), new BigDecimal("9007199254740993"), PaymentMethod.CASH, null, null);
        var json = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(request));
        assertTrue(json.get("amount").isTextual());
        assertEquals("9007199254740993", json.get("amount").asText());
    }
    @Test void rejectsFractionAndOverflowBeforeDatabaseRounding() {
        assertThrows(IllegalArgumentException.class, () -> Money.requireWhole(new BigDecimal("1.5")));
        assertThrows(IllegalArgumentException.class, () -> Money.requireWhole(new BigDecimal("10000000000000000000")));
        assertDoesNotThrow(() -> Money.requireWhole(new BigDecimal("9999999999999999999")));
    }
}
