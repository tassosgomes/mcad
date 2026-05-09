package br.com.ecad.arrecadacao.application.audit;

import br.com.ecad.arrecadacao.domain.entities.Licenca;

import java.util.HashMap;
import java.util.Map;

public final class LicencaAuditMapper {
    private LicencaAuditMapper() {}

    public static Map<String, Object> map(Licenca licenca) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", licenca.getId().toString());
        data.put("usuarioMusicaId", licenca.getUsuarioMusicaId().toString());
        data.put("rubricaId", licenca.getRubricaId().toString());
        data.put("dataInicio", licenca.getDataInicio() == null ? null : licenca.getDataInicio().toString());
        data.put("dataFim", licenca.getDataFim() == null ? null : licenca.getDataFim().toString());
        data.put("status", licenca.getStatus().name());
        data.put("criadoEm", licenca.getCriadoEm() == null ? null : licenca.getCriadoEm().toString());
        data.put("atualizadoEm", licenca.getAtualizadoEm() == null ? null : licenca.getAtualizadoEm().toString());
        return data;
    }
}
