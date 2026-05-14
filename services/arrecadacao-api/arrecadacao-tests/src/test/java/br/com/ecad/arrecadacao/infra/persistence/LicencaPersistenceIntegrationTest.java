package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.application.specification.LicencaSpecification;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.util.ReflectionTestUtils;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;

@SpringBootTest(
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@Transactional
@SuppressWarnings("null")
class LicencaPersistenceIntegrationTest {

    @Autowired Flyway flyway;
    @Autowired JpaLicencaRepository licencaRepository;
    @Autowired JpaHistoricoStatusLicencaRepository historicoRepository;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaSpringData;
    @Autowired SpringDataRubricaRepository rubricaSpringData;
    @Autowired EntityManager entityManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Test
    void deveFalharComFkUsuarioInexistente() {
        var rubrica = new Rubrica(UUID.randomUUID(), "RB2", "Rubrica Teste 2", false);
        rubricaSpringData.saveAndFlush(rubrica);

        var licenca = Licenca.criar(UUID.randomUUID(), rubrica.getId(), LocalDate.now(), null);
        
        assertThrows(Exception.class, () -> {
            licencaRepository.save(licenca);
            entityManager.flush();
        });
    }

    @Test
    void deveFiltrarLicencasVigentes() {
        var usuario = UsuarioMusica.criar("Empresa X", "Fantasia", Cnpj.criar("60914221000105"), Endereco.criar("12345678", "Logradouro", "123", "Complemento", "Bairro", "Cidade", "UF"), Contato.criar("Responsavel", "1234", "test@test.com"));
        usuarioMusicaSpringData.saveAndFlush(usuario);

        var rubrica = new Rubrica(UUID.randomUUID(), "RBX", "Rubrica X", false);
        rubricaSpringData.saveAndFlush(rubrica);

        var licenca1 = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), null);
        var licenca2 = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), LocalDate.now().plusYears(1));
        var licenca3 = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), LocalDate.now().plusYears(1));
        ReflectionTestUtils.setField(licenca3, "dataInicio", LocalDate.now().minusYears(2));
        ReflectionTestUtils.setField(licenca3, "dataFim", LocalDate.now().minusYears(1));
        
        licencaRepository.save(licenca1);
        licencaRepository.save(licenca2);
        licencaRepository.save(licenca3);

        var spec = LicencaSpecification.comFiltros(null, null, null, null, Boolean.TRUE);
        
        // Paginacao e findAll usando SpringDataLicencaRepository seria necessario se fosse invocado diretamente o findAll, mas licencaRepository adapter exige passar spec via SpringData.
        // Wait, JpaLicencaRepository has `Page<Licenca> findAll(Specification<Licenca> spec, Pageable pageable)` implemented in application layer, so we can use it.
        var page = licencaRepository.findAll(spec, Pageable.unpaged());
        
        // Deve encontrar apenas as que estao vigentes para este teste
        // porem a base de testes pode estar suja. como tem @Transactional deve limpar.
        assertThat(page.getContent()).extracting("id").contains(licenca1.getId(), licenca2.getId()).doesNotContain(licenca3.getId());
    }

    @Test
    void deveFiltrarLicencasExpiradas() {
        var usuario = UsuarioMusica.criar("Empresa Y", "Fantasia", Cnpj.criar("08673009000175"), Endereco.criar("12345678", "Logradouro", "123", "Complemento", "Bairro", "Cidade", "UF"), Contato.criar("Responsavel", "1234", "test@test.com"));
        usuarioMusicaSpringData.saveAndFlush(usuario);

        var rubrica = new Rubrica(UUID.randomUUID(), "RBY", "Rubrica Y", false);
        rubricaSpringData.saveAndFlush(rubrica);

        var licenca1 = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), null);
        var licenca2 = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), LocalDate.now().plusYears(1));
        ReflectionTestUtils.setField(licenca2, "dataInicio", LocalDate.now().minusYears(2));
        ReflectionTestUtils.setField(licenca2, "dataFim", LocalDate.now().minusYears(1));
        
        licencaRepository.save(licenca1);
        licencaRepository.save(licenca2);

        var spec = LicencaSpecification.comFiltros(null, null, null, null, Boolean.FALSE);
        var page = licencaRepository.findAll(spec, Pageable.unpaged());
        
        assertThat(page.getContent()).extracting("id").contains(licenca2.getId()).doesNotContain(licenca1.getId());
    }
}
