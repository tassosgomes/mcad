package br.com.ecad.arrecadacao.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication(scanBasePackages = "br.com.ecad.arrecadacao")
@EnableJpaRepositories(basePackages = "br.com.ecad.arrecadacao.infra.persistence")
@EntityScan(basePackages = "br.com.ecad.arrecadacao.domain")
public class ArrecadacaoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArrecadacaoApplication.class, args);
    }
}
