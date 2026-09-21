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

    public static <T> ApiResponse<java.util.List<T>> ofPage(org.springframework.data.domain.Page<T> page) {
        Map<String, Object> meta = Map.of(
                "page", page.getNumber(),
                "size", page.getSize(),
                "totalElements", page.getTotalElements(),
                "totalPages", page.getTotalPages(),
                "traceId", java.util.UUID.randomUUID().toString()
        );
        return new ApiResponse<>(page.getContent(), meta);
    }
}
