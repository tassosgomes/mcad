package br.com.ecad.arrecadacao.application.events;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;

import java.util.HashMap;
import java.util.Map;

public final class UsuarioMusicaIntegrationEventMapper {

    private UsuarioMusicaIntegrationEventMapper() {
    }

    public static Map<String, Object> toPayload(UsuarioMusica u) {
        Map<String, Object> p = new HashMap<>();
        p.put("id", u.getId().toString());
        p.put("razaoSocial", u.getRazaoSocial());
        p.put("nomeFantasia", u.getNomeFantasia());
        p.put("cnpj", u.getCnpj().getValor());
        p.put("cnpjFormatado", u.getCnpj().getFormatado());
        p.put("status", u.getStatus().name());
        p.put("criadoEm", u.getCriadoEm().toString());
        p.put("atualizadoEm", u.getAtualizadoEm().toString());
        return p;
    }
}
