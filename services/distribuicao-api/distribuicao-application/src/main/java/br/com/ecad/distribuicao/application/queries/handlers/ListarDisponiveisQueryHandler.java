package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.DisponibilidadeResponse;
import br.com.ecad.distribuicao.application.queries.ListarDisponiveisQuery;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotListPort;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ListarDisponiveisQueryHandler {

    private final SnapshotListPort snapshotListPort;
    private final ProcessoRepository processoRepository;

    public ListarDisponiveisQueryHandler(
            SnapshotListPort snapshotListPort,
            ProcessoRepository processoRepository) {
        this.snapshotListPort = snapshotListPort;
        this.processoRepository = processoRepository;
    }

    @Transactional(readOnly = true)
    public List<DisponibilidadeResponse> handle(ListarDisponiveisQuery query) {
        // Buscar todos SnapshotRol não cancelados
        List<SnapshotRol> rols = snapshotListPort.findAllRolAtivos();

        // Buscar todos SnapshotVerba
        List<SnapshotVerba> verbas = snapshotListPort.findAllVerbas();

        // Processos ativos (não cancelados)
        Set<String> ativosKeys = new HashSet<>();
        processoRepository.findAtivos().stream()
                .filter(p -> p.getStatus() != StatusProcesso.CANCELADO)
                .forEach(p -> ativosKeys.add(key(p.getRubricaSigla(), p.getPeriodo())));

        // Cruzar: combinações com Rol+Verba disponíveis e SEM processo ativo
        List<DisponibilidadeResponse> disponiveis = new ArrayList<>();
        for (SnapshotRol rol : rols) {
            String chave = key(rol.getRubricaSigla(), rol.getPeriodo());
            if (ativosKeys.contains(chave)) {
                continue; // já existe processo ativo para essa combinação
            }
            // Verificar se há Verba correspondente
            verbas.stream()
                    .filter(v -> v.getRubricaSigla().equals(rol.getRubricaSigla())
                            && v.getPeriodo().equals(rol.getPeriodo()))
                    .findFirst()
                    .ifPresent(verba -> disponiveis.add(new DisponibilidadeResponse(
                            rol.getRubricaSigla(),
                            rol.getPeriodo(),
                            verba.getVerbaLiquida(),
                            rol.getTotalExecucoes())));
        }

        return disponiveis;
    }

    private String key(String rubricaSigla, String periodo) {
        return rubricaSigla + "|" + periodo;
    }
}
