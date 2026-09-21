package vn.trohub.auth.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.trohub.common.api.ApiResponse;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @GetMapping("/csrf")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCsrfToken() {
        Map<String, String> data = Map.of(
                "token", UUID.randomUUID().toString(),
                "headerName", "X-XSRF-TOKEN"
        );
        return ResponseEntity.ok(ApiResponse.of(data));
    }
}
