package vn.trohub.common.api;

import java.util.List;

public record ApiError(
        String code,
        String message,
        List<FieldErrorItem> fieldErrors,
        String traceId
) {
    public record FieldErrorItem(String field, String message) {}

    public static ApiError of(String code, String message, String traceId) {
        return new ApiError(code, message, List.of(), traceId);
    }

    public static ApiError of(String code, String message, List<FieldErrorItem> fieldErrors, String traceId) {
        return new ApiError(code, message, fieldErrors, traceId);
    }
}
