package vn.trohub.common.api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;

@Configuration
public class OpenApiConfig {
    @Bean public OpenAPI trohubApi() {
        return new OpenAPI().openapi("3.0.3")
            .info(new Info().title("TroHub API").version("1.0.0").description("Integer VND amounts are decimal strings. Dates use Asia/Ho_Chi_Minh. Financial commands require X-Idempotency-Key."))
            .components(new Components().addSecuritySchemes("bearerAuth",new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
