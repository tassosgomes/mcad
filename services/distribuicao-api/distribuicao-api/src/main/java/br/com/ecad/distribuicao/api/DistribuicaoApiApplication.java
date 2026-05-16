package br.com.ecad.distribuicao.api;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "br.com.ecad.distribuicao")
@EntityScan(basePackageClasses = Rubrica.class)
@EnableJpaRepositories(basePackages = "br.com.ecad.distribuicao.infra.persistence")
@EnableScheduling
public class DistribuicaoApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DistribuicaoApiApplication.class, args);
    }
}
