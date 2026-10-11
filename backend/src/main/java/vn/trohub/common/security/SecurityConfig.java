package vn.trohub.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @org.springframework.beans.factory.annotation.Value("${trohub.auth.secure-cookies:true}")
    private boolean secureCookies;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, com.fasterxml.jackson.databind.ObjectMapper mapper) throws Exception {
        var csrfRepo = org.springframework.security.web.csrf.CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookieCustomizer(cookie -> {
            if (secureCookies) {
                cookie.sameSite("None").secure(true).path("/");
            } else {
                cookie.sameSite("Lax").secure(false).path("/");
            }
        });

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfRepo)
                .csrfTokenRequestHandler(new org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler())
                .requireCsrfProtectionMatcher(request ->
                    request.getRequestURI().startsWith("/api/v1/auth/web/")
                    && !List.of("GET", "HEAD", "OPTIONS").contains(request.getMethod())))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401); response.setContentType("application/json;charset=UTF-8");
                    response.setHeader("WWW-Authenticate", "Bearer");
                    mapper.writeValue(response.getOutputStream(), vn.trohub.common.api.ApiError.of("UNAUTHORIZED", "Vui lòng đăng nhập lại", java.util.UUID.randomUUID().toString()));
                })
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403); response.setContentType("application/json;charset=UTF-8");
                    mapper.writeValue(response.getOutputStream(), vn.trohub.common.api.ApiError.of("FORBIDDEN", "Không có quyền thực hiện yêu cầu", java.util.UUID.randomUUID().toString()));
                }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @org.springframework.beans.factory.annotation.Value("${trohub.security.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://127.0.0.1:*,https://*.vercel.app}")
    private List<String> allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(allowedOrigins != null && !allowedOrigins.isEmpty() 
            ? allowedOrigins 
            : List.of("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:*", "https://*.vercel.app"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Idempotency-Key", "X-Trace-Id"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
