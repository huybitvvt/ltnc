package vn.trohub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class TroHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(TroHubApplication.class, args);
    }
}
