package br.com.ecad.distribuicao.api.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Expõe um bean {@link Clock} (UTC) para injeção em serviços e handlers.
 * Em testes, substitua por {@code Clock.fixed(instant, ZoneOffset.UTC)} via
 * {@code @MockBean} ou {@code @TestConfiguration}.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock systemClock() {
        return Clock.systemUTC();
    }
}
