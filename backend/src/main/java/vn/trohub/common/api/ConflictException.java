package vn.trohub.common.api;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
