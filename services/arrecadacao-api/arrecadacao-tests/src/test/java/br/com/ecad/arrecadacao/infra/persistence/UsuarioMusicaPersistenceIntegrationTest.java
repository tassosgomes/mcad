package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes de integração de persistência — executa contra o PostgreSQL
 * do docker-compose.dev.yml (localhost:5432, user=gestauto).
 *
 * <p>Para rodar: certifique-se de que {@code docker compose -f docker-compose.dev.yml up -d}
 * está ativo antes de executar {@code mvn test -pl arrecadacao-tests}.
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
class UsuarioMusicaPersistenceIntegrationTest {

    @Autowired
    private UsuarioMusicaRepository repository;

    @Autowired
    private HistoricoStatusUsuarioRepository historicoRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setup() {
        jdbcTemplate.execute("TRUNCATE TABLE arrecadacao.historico_status_usuario, arrecadacao.usuarios_musica CASCADE");
    }

    // ── 7.1: Flyway migrations ──────────────────────────────────────

    @Test
    void deveAplicarMigrationsDoFlyway() {
        Integer migrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM arrecadacao.flyway_schema_history WHERE success = true",
                Integer.class);
        assertThat(migrationCount).isGreaterThanOrEqualTo(2);
    }

    // ── 7.1: CRUD via repositórios ──────────────────────────────────

    @Test
    void devePersistirUsuarioComCnpjValido() {
        Endereco endereco = Endereco.criar("01001000", "Praça da Sé", "1000", null, "Sé", "São Paulo", "SP");
        Contato contato = Contato.criar("João Silva", "(11) 99999-8888", "joao@radio.com");
        UsuarioMusica usuario = UsuarioMusica.criar(
                "Radio Cidade FM", "Radio Cidade", Cnpj.criar("50997063000132"),
                endereco, contato);

        UsuarioMusica salvo = repository.save(usuario);

        UsuarioMusica retornado = repository.findById(salvo.getId()).orElseThrow();
        assertThat(retornado.getRazaoSocial()).isEqualTo("Radio Cidade FM");
        assertThat(retornado.getNomeFantasia()).isEqualTo("Radio Cidade");
        assertThat(retornado.getCnpj().getValor()).isEqualTo("50997063000132");
        assertThat(retornado.getCnpj().getFormatado()).isEqualTo("50.997.063/0001-32");
        assertThat(retornado.getStatus()).isEqualTo(StatusUsuarioMusica.ATIVO);
        assertThat(retornado.getEndereco()).isNotNull();
        assertThat(retornado.getEndereco().getCidade()).isEqualTo("São Paulo");
        assertThat(retornado.getContato()).isNotNull();
        assertThat(retornado.getContato().getNomeResponsavel()).isEqualTo("João Silva");
    }

    // ── 7.1: UNIQUE cnpj ────────────────────────────────────────────

    @Test
    void deveRejeitarCnpjDuplicadoViaConstraint() {
        Endereco endereco = Endereco.criar("01001000", "Praça", "1", null, "Bairro", "Cidade", "SP");
        Contato contato = Contato.criar("Resp 1", null, null);
        UsuarioMusica u1 = UsuarioMusica.criar(
                "Empresa 1", null, Cnpj.criar("50997063000132"), endereco, contato);
        repository.save(u1);

        UsuarioMusica u2 = UsuarioMusica.criar(
                "Empresa 2", null, Cnpj.criar("50997063000132"), endereco, contato);

        assertThatThrownBy(() -> repository.save(u2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ── 7.1: Specification filters ──────────────────────────────────

    @Test
    void deveFiltrarPorRazaoSocialParcial() {
        criarUsuario("Radio Cidade FM", "50997063000132");
        criarUsuario("TV Globo Comunicacao", "11222333000181");

        Specification<UsuarioMusica> spec = (root, query, cb) ->
                cb.like(cb.lower(root.get("razaoSocial")), "%radio%");

        Page<UsuarioMusica> resultado = repository.findAll(spec, PageRequest.of(0, 10));

        assertThat(resultado.getContent()).hasSize(1);
        assertThat(resultado.getContent().get(0).getRazaoSocial()).isEqualTo("Radio Cidade FM");
    }

    @Test
    void deveFiltrarPorStatus() {
        UsuarioMusica ativo = criarUsuario("Radio Ativa", "50997063000132");
        UsuarioMusica inativo = criarUsuario("Radio Inativa", "11222333000181");
        inativo.inativar("Encerrou atividades", "analista1");
        repository.save(inativo);

        Specification<UsuarioMusica> spec = (root, query, cb) ->
                cb.equal(root.get("status"), StatusUsuarioMusica.ATIVO);

        Page<UsuarioMusica> resultado = repository.findAll(spec, PageRequest.of(0, 10));

        assertThat(resultado.getContent()).hasSize(1);
        assertThat(resultado.getContent().get(0).getRazaoSocial()).isEqualTo("Radio Ativa");
    }

    // ── 7.1: Histórico de status ────────────────────────────────────

    @Test
    void devePersistirHistoricoDeStatus() {
        UsuarioMusica usuario = criarUsuario("Radio Teste", "98765432000198");

        HistoricoStatusUsuario h1 = usuario.inativar("Encerrou atividades", "analista1");
        repository.save(usuario);
        historicoRepository.save(h1);

        HistoricoStatusUsuario h2 = usuario.ativar("Normalizou documentacao", "analista2");
        repository.save(usuario);
        historicoRepository.save(h2);

        List<HistoricoStatusUsuario> historico =
                historicoRepository.findByUsuarioMusicaIdOrderByDataDesc(usuario.getId());

        assertThat(historico).hasSize(2);
        assertThat(historico.get(0).getStatusNovo()).isEqualTo(StatusUsuarioMusica.ATIVO);
        assertThat(historico.get(0).getAutor()).isEqualTo("analista2");
        assertThat(historico.get(1).getStatusNovo()).isEqualTo(StatusUsuarioMusica.INATIVO);
        assertThat(historico.get(1).getAutor()).isEqualTo("analista1");
    }

    // ── Helper ─────────────────────────────────────────────────────

    private UsuarioMusica criarUsuario(String razaoSocial, String cnpj) {
        Endereco endereco = Endereco.criar("01001000", "Praça", "100", null, "Bairro", "Cidade", "SP");
        Contato contato = Contato.criar("Responsavel", null, null);
        UsuarioMusica usuario = UsuarioMusica.criar(razaoSocial, null, Cnpj.criar(cnpj), endereco, contato);
        return repository.save(usuario);
    }
}
