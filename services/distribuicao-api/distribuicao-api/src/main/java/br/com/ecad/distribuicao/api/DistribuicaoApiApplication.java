package br.com.ecad.distribuicao.api;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "br.com.ecad.distribuicao")
@EntityScan(basePackageClasses = Rubrica.class)
@EnableJpaRepositories(basePackages = "br.com.ecad.distribuicao.infra.persistence")
public class DistribuicaoApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DistribuicaoApiApplication.class, args);
    }
}
