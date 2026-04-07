package br.com.ecad.arrecadacao.application.specification;

import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

public class LicencaSpecification {

    public static Specification<Licenca> comFiltros(
            UUID usuarioMusicaId, String razaoSocial, String rubricaSigla,
            StatusLicenca status, Boolean vigente) {
        return Specification.where(usuarioMusicaIdIgual(usuarioMusicaId))
                .and(razaoSocialContem(razaoSocial))
                .and(rubricaSiglaContem(rubricaSigla))
                .and(statusIgual(status))
                .and(vigente(vigente));
    }

    private static Specification<Licenca> usuarioMusicaIdIgual(UUID valor) {
        if (valor == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("usuarioMusicaId"), valor);
    }

    private static Specification<Licenca> razaoSocialContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("usuarioMusica").get("razaoSocial")),
                    "%" + valor.toLowerCase() + "%");
    }

    private static Specification<Licenca> rubricaSiglaContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("rubrica").get("sigla")),
                    "%" + valor.toLowerCase() + "%");
    }

    private static Specification<Licenca> statusIgual(StatusLicenca valor) {
        if (valor == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("status"), valor);
    }

    private static Specification<Licenca> vigente(Boolean valor) {
        if (valor == null) return null;
        return (root, query, cb) -> {
            var hoje = LocalDate.now();
            if (valor) {
                // vigente=true: dataFim nula OU dataFim >= hoje
                return cb.or(
                    cb.isNull(root.get("dataFim")),
                    cb.greaterThanOrEqualTo(root.get("dataFim"), hoje));
            } else {
                // vigente=false: dataFim preenchida E dataFim < hoje
                return cb.and(
                    cb.isNotNull(root.get("dataFim")),
                    cb.lessThan(root.get("dataFim"), hoje));
            }
        };
    }
}
