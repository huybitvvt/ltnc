package vn.trohub.common.money;

import java.math.BigDecimal;

public final class Money {
    private Money() {}
    public static void requireWhole(BigDecimal amount) {
        if (amount == null || amount.stripTrailingZeros().scale() > 0 || amount.precision() - amount.scale() > 19)
            throw new IllegalArgumentException("Số tiền phải là số nguyên VND, tối đa 19 chữ số");
    }
}
