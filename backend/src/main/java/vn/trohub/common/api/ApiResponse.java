package vn.trohub.common.api;

import java.util.Map;

public record ApiResponse<T>(T data, Map<String, Object> meta) {

    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(data, Map.of("traceId", java.util.UUID.randomUUID().toString()));
    }

    public static <T> ApiResponse<T> ok(T data) {
        return of(data);
    }

    public static <T> ApiResponse<T> of(T data, Map<String, Object> meta) {
        return new ApiResponse<>(data, meta);
    }
}
