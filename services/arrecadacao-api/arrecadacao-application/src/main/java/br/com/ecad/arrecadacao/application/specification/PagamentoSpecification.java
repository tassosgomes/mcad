package br.com.ecad.arrecadacao.application.specification;

import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class PagamentoSpecification {

    public static Specification<Pagamento> comFiltros(
            UUID usuarioMusicaId, String razaoSocial,
            String rubricaSigla, String periodo, StatusPagamento status) {
        return Specification.where(usuarioMusicaIdIgual(usuarioMusicaId))
                .and(razaoSocialContem(razaoSocial))
                .and(rubricaSiglaContem(rubricaSigla))
                .and(periodoIgual(periodo))
                .and(statusIgual(status));
    }

    private static Specification<Pagamento> usuarioMusicaIdIgual(UUID valor) {
        if (valor == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("licenca").get("usuarioMusicaId"), valor);
    }

    private static Specification<Pagamento> razaoSocialContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("licenca").get("usuarioMusica").get("razaoSocial")),
                    "%" + valor.toLowerCase() + "%");
    }

    private static Specification<Pagamento> rubricaSiglaContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("licenca").get("rubrica").get("sigla")),
                    "%" + valor.toLowerCase() + "%");
    }

    private static Specification<Pagamento> periodoIgual(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.equal(root.get("periodo"), valor);
    }

    private static Specification<Pagamento> statusIgual(StatusPagamento valor) {
        if (valor == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("status"), valor);
    }
}
