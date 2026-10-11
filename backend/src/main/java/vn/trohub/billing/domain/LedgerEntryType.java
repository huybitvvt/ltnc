package vn.trohub.billing.domain;

public enum LedgerEntryType {
    PAYMENT,
    PAYMENT_CORRECTION,
    REFUND,
    CREDIT_APPLIED,
    CREDIT_OUT,
    CREDIT_IN,
    DEPOSIT_OFFSET
}
