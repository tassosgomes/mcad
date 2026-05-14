package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.application.commands.AtivarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.InativarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.AtualizarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.CriarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandDispatcher;
import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.AlterarStatusRequest;
import br.com.ecad.arrecadacao.application.dto.AtualizarUsuarioMusicaRequest;
import br.com.ecad.arrecadacao.application.dto.CriarUsuarioMusicaRequest;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusResponse;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarUsuarioMusicaPorIdQuery;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusQuery;
import br.com.ecad.arrecadacao.application.queries.ListarUsuariosMusicaQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/usuarios-musica")
@SuppressWarnings("null")
public class UsuarioMusicaController {

    private static final Logger log = LoggerFactory.getLogger(UsuarioMusicaController.class);

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    public UsuarioMusicaController(CommandDispatcher commandDispatcher, QueryDispatcher queryDispatcher) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
    }

    @GetMapping
    @RequiresPermission("arrecadacao:default:cliente:listar")
    public ResponseEntity<PageResponse<UsuarioMusicaResponse>> listar(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "sort", defaultValue = "razaoSocial") String sort,
            @RequestParam(name = "razaoSocial", required = false) String razaoSocial,
            @RequestParam(name = "cnpj", required = false) String cnpj,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "cidade", required = false) String cidade) {
        log.info("Listando usuários de música com filtros");
        StatusUsuarioMusica statusEnum = status != null ? StatusUsuarioMusica.valueOf(status) : null;
        var query = new ListarUsuariosMusicaQuery(razaoSocial, cnpj, statusEnum, cidade, page, size, sort);
        return ResponseEntity.ok((PageResponse<UsuarioMusicaResponse>) queryDispatcher.dispatch(query));
    }

    @GetMapping("/{id}")
    @RequiresPermission("arrecadacao:default:cliente:visualizar")
    public ResponseEntity<UsuarioMusicaResponse> buscarPorId(@PathVariable("id") UUID id) {
        log.info("Buscando usuário de música {}", id);
        var query = new BuscarUsuarioMusicaPorIdQuery(id);
        return ResponseEntity.ok((UsuarioMusicaResponse) queryDispatcher.dispatch(query));
    }

    @GetMapping("/{id}/historico-status")
    @RequiresPermission("arrecadacao:default:cliente:visualizar")
    public ResponseEntity<List<HistoricoStatusResponse>> listarHistorico(@PathVariable("id") UUID id) {
        log.info("Buscando histórico do usuário {}", id);
        var query = new ListarHistoricoStatusQuery(id);
        return ResponseEntity.ok((List<HistoricoStatusResponse>) queryDispatcher.dispatch(query));
    }

    @PostMapping
    @RequiresPermission("arrecadacao:default:cliente:criar")
    public ResponseEntity<UsuarioMusicaResponse> criar(@Valid @RequestBody CriarUsuarioMusicaRequest request) {
        log.info("Criando usuário de música {}", request.razaoSocial());
        String autor = extrairAutorDoJwt();
        var command = new CriarUsuarioMusicaCommand(
                request.razaoSocial(), request.nomeFantasia(), request.cnpj(),
                request.endereco(), request.contato(), autor);
        var response = (UsuarioMusicaResponse) commandDispatcher.dispatch(command);
        return ResponseEntity.created(URI.create("/api/v1/usuarios-musica/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission("arrecadacao:default:cliente:editar")
    public ResponseEntity<UsuarioMusicaResponse> atualizar(
            @PathVariable("id") UUID id, @Valid @RequestBody AtualizarUsuarioMusicaRequest request) {
        log.info("Atualizando usuário de música {}", id);
        String autor = extrairAutorDoJwt();
        var command = new AtualizarUsuarioMusicaCommand(
                id, request.razaoSocial(), request.nomeFantasia(),
                request.endereco(), request.contato(), autor);
        var response = (UsuarioMusicaResponse) commandDispatcher.dispatch(command);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/inativar")
    @RequiresPermission("arrecadacao:default:cliente:editar")
    public ResponseEntity<UsuarioMusicaResponse> inativar(
            @PathVariable("id") UUID id, @Valid @RequestBody AlterarStatusRequest request) {
        log.info("Inativando usuário de música {}", id);
        String autor = extrairAutorDoJwt();
        var command = new InativarUsuarioMusicaCommand(id, request.justificativa(), autor);
        commandDispatcher.dispatch(command);
        return buscarPorId(id);
    }

    @PostMapping("/{id}/ativar")
    @RequiresPermission("arrecadacao:default:cliente:editar")
    public ResponseEntity<UsuarioMusicaResponse> ativar(
            @PathVariable("id") UUID id, @Valid @RequestBody AlterarStatusRequest request) {
        log.info("Ativando usuário de música {}", id);
        String autor = extrairAutorDoJwt();
        var command = new AtivarUsuarioMusicaCommand(id, request.justificativa(), autor);
        commandDispatcher.dispatch(command);
        return buscarPorId(id);
    }

    private String extrairAutorDoJwt() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            var claims = jwt.getToken().getClaims();
            String username = (String) claims.get("preferred_username");
            return username != null ? username : (String) claims.get("sub");
        }
        return (auth != null && auth.getName() != null) ? auth.getName() : "sistema";
    }
}
