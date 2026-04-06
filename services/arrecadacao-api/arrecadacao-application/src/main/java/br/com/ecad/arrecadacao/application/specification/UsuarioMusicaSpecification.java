package br.com.ecad.arrecadacao.application.specification;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import org.springframework.data.jpa.domain.Specification;

public class UsuarioMusicaSpecification {

    public static Specification<UsuarioMusica> comFiltros(String razaoSocial, String cnpj, StatusUsuarioMusica status, String cidade) {
        return Specification.where(razaoSocialContem(razaoSocial))
                .and(cnpjContem(cnpj))
                .and(statusIgual(status))
                .and(cidadeContem(cidade));
    }

    private static Specification<UsuarioMusica> razaoSocialContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) -> cb.like(cb.lower(root.get("razaoSocial")), "%" + valor.toLowerCase() + "%");
    }

    private static Specification<UsuarioMusica> cnpjContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String clean = valor.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        return (root, query, cb) -> cb.like(root.get("cnpj").get("valor"), "%" + clean + "%");
    }

    private static Specification<UsuarioMusica> statusIgual(StatusUsuarioMusica valor) {
        if (valor == null) return null;
        return (root, query, cb) -> cb.equal(root.get("status"), valor);
    }

    private static Specification<UsuarioMusica> cidadeContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) -> cb.like(cb.lower(root.get("endereco").get("cidade")), "%" + valor.toLowerCase() + "%");
    }
}
