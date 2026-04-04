package br.com.ecad.arrecadacao.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication(scanBasePackages = "br.com.ecad.arrecadacao")
public class ArrecadacaoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArrecadacaoApplication.class, args);
    }
}
