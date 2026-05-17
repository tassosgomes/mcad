package br.com.ecad.distribuicao.domain.calculo;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class CalculadoraCreditos {

    private static final BigDecimal CEM_POR_CENTO = new BigDecimal("100.0000");
    private static final BigDecimal SPLIT_AUTORAL_COM_FONOGRAMA = new BigDecimal("0.6667");
    private static final BigDecimal UM_CENTAVO = new BigDecimal("0.01");
    private static final int ESCALA_CALCULO = 12;

    public ResultadoCalculo calcular(CalculoCreditosInput input) {
        validarInput(input);

        Map<WorkKey, WorkExecution> execucoesPorObra = agruparExecucoes(input.execucoes());
        BigDecimal totalPontos = calcularTotalPontos(execucoesPorObra);
        Map<WorkKey, BigDecimal> valoresObra = alocarVerbaPorObra(
                input.verbaLiquida(),
                execucoesPorObra,
                totalPontos);

        OwnershipIndex ownershipIndex = indexarOwnership(input.ownershipSnapshot());
        Instant calculadoEm = Instant.now();
        List<Credito> creditos = gerarCreditos(
                input.processoId(),
                execucoesPorObra,
                valoresObra,
                ownershipIndex,
                calculadoEm);
        BigDecimal valorTotalCalculado = somarValores(creditos);
        int totalCreditosRetidos = (int) creditos.stream()
                .filter(credito -> credito.getStatus() == StatusCredito.RETIDO)
                .count();
        BigDecimal valorTotalRetido = creditos.stream()
                .filter(credito -> credito.getStatus() == StatusCredito.RETIDO)
                .map(Credito::getValorCredito)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        ResumoCalculo resumo = new ResumoCalculo(
                input.verbaLiquida().setScale(2, RoundingMode.HALF_UP),
                somarExecucoes(input.execucoes()),
                totalPontos.setScale(6, RoundingMode.HALF_UP),
                contarObras(input.execucoes()),
                creditos.size(),
                valorTotalCalculado,
                totalCreditosRetidos,
                valorTotalRetido,
                calculadoEm);
        return new ResultadoCalculo(creditos, resumo);
    }

    private void validarInput(CalculoCreditosInput input) {
        if (input == null) {
            throw new PreRequisitosException("Dados de cálculo são obrigatórios");
        }
        if (input.execucoes().isEmpty()) {
            throw new PreRequisitosException("Rol de execuções não pode estar vazio");
        }
        if (input.verbaLiquida().compareTo(BigDecimal.ZERO) <= 0) {
            throw new PreRequisitosException("Verba Líquida deve ser positiva");
        }
    }

    private Map<WorkKey, WorkExecution> agruparExecucoes(List<ExecucaoRol> execucoes) {
        Map<WorkKey, WorkExecution> agrupadas = new HashMap<>();
        for (ExecucaoRol execucao : execucoes) {
            validarExecucao(execucao);
            WorkKey key = new WorkKey(execucao.obraId(), execucao.fonogramaId());
            BigDecimal pontos = calcularPontos(execucao);
            agrupadas.merge(
                    key,
                    new WorkExecution(key, execucao.obraTitulo().trim(), pontos),
                    (atual, nova) -> atual.somarPontos(nova.pontos()));
        }
        return agrupadas;
    }

    private void validarExecucao(ExecucaoRol execucao) {
        if (execucao.quantidadeExecucoes() <= 0) {
            throw new PreRequisitosException("Quantidade de execuções deve ser positiva");
        }
        if (execucao.pesoTipoUtilizacao().compareTo(BigDecimal.ZERO) <= 0) {
            throw new PreRequisitosException("Peso do tipo de utilização deve ser positivo");
        }
        if (execucao.obraTitulo().isBlank()) {
            throw new PreRequisitosException("Título da obra é obrigatório");
        }
    }

    private BigDecimal calcularPontos(ExecucaoRol execucao) {
        return BigDecimal.valueOf(execucao.quantidadeExecucoes()).multiply(execucao.pesoTipoUtilizacao());
    }

    private BigDecimal calcularTotalPontos(Map<WorkKey, WorkExecution> execucoesPorObra) {
        BigDecimal totalPontos = execucoesPorObra.values().stream()
                .map(WorkExecution::pontos)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPontos.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PreRequisitosException("Total de pontos do Rol deve ser positivo");
        }
        return totalPontos;
    }

    private Map<WorkKey, BigDecimal> alocarVerbaPorObra(
            BigDecimal verbaLiquida,
            Map<WorkKey, WorkExecution> execucoesPorObra,
            BigDecimal totalPontos) {
        BigDecimal verbaArredondada = verbaLiquida.setScale(2, RoundingMode.HALF_UP);
        List<AllocationDraft> drafts = execucoesPorObra.values().stream()
                .map(execucao -> new AllocationDraft(
                        execucao.key(),
                        verbaLiquida.multiply(execucao.pontos()).divide(totalPontos, ESCALA_CALCULO, RoundingMode.HALF_UP),
                        execucao.pontos()))
                .toList();

        Map<WorkKey, BigDecimal> valores = reconciliarAlocacoes(drafts, verbaArredondada).stream()
                .collect(Collectors.toMap(result -> (WorkKey) result.key(), AllocationResult::valor));
        if (somarValores(valores.values()).compareTo(verbaArredondada) != 0) {
            throw new PreRequisitosException("Falha ao reconciliar valores por obra");
        }
        return valores;
    }

    private OwnershipIndex indexarOwnership(OwnershipSnapshot snapshot) {
        Map<UUID, ObraOwnership> obras = new HashMap<>();
        for (ObraOwnership obra : snapshot.obras()) {
            if (obras.putIfAbsent(obra.obraId(), obra) != null) {
                throw new PreRequisitosException("Ownership de obra duplicado: " + obra.obraId());
            }
        }

        Map<UUID, FonogramaOwnership> fonogramas = new HashMap<>();
        for (FonogramaOwnership fonograma : snapshot.fonogramas()) {
            if (fonogramas.putIfAbsent(fonograma.fonogramaId(), fonograma) != null) {
                throw new PreRequisitosException("Ownership de fonograma duplicado: " + fonograma.fonogramaId());
            }
        }
        return new OwnershipIndex(obras, fonogramas);
    }

    private List<Credito> gerarCreditos(
            UUID processoId,
            Map<WorkKey, WorkExecution> execucoesPorObra,
            Map<WorkKey, BigDecimal> valoresObra,
            OwnershipIndex ownershipIndex,
            Instant calculadoEm) {
        List<Credito> creditos = new ArrayList<>();
        for (WorkExecution execucao : execucoesPorObra.values()) {
            BigDecimal valorObra = valoresObra.get(execucao.key());
            ObraOwnership obra = buscarObraOwnership(ownershipIndex, execucao.key().obraId());
            if (execucao.key().hasFonograma()) {
                creditos.addAll(gerarCreditosComFonograma(processoId, execucao, valorObra, obra, ownershipIndex, calculadoEm));
            } else {
                creditos.addAll(gerarCreditosAutorais(processoId, execucao, valorObra, obra, calculadoEm));
            }
        }
        return List.copyOf(creditos);
    }

    private ObraOwnership buscarObraOwnership(OwnershipIndex ownershipIndex, UUID obraId) {
        ObraOwnership obra = ownershipIndex.obras().get(obraId);
        if (obra == null) {
            throw new PreRequisitosException("Titularidade autoral não encontrada para obra " + obraId);
        }
        return obra;
    }

    private List<Credito> gerarCreditosComFonograma(
            UUID processoId,
            WorkExecution execucao,
            BigDecimal valorObra,
            ObraOwnership obra,
            OwnershipIndex ownershipIndex,
            Instant calculadoEm) {
        FonogramaOwnership fonograma = buscarFonogramaOwnership(ownershipIndex, execucao.key());
        BigDecimal valorAutoral = valorObra.multiply(SPLIT_AUTORAL_COM_FONOGRAMA).setScale(2, RoundingMode.HALF_UP);
        BigDecimal valorConexo = valorObra.subtract(valorAutoral).setScale(2, RoundingMode.HALF_UP);

        List<Credito> creditos = new ArrayList<>();
        creditos.addAll(gerarCreditosAutorais(processoId, execucao, valorAutoral, obra, calculadoEm));
        creditos.addAll(gerarCreditosConexos(processoId, execucao, valorConexo, obra, fonograma, calculadoEm));
        return creditos;
    }

    private FonogramaOwnership buscarFonogramaOwnership(OwnershipIndex ownershipIndex, WorkKey key) {
        FonogramaOwnership fonograma = ownershipIndex.fonogramas().get(key.fonogramaId());
        if (fonograma == null) {
            throw new PreRequisitosException("Participação conexa não encontrada para fonograma " + key.fonogramaId());
        }
        if (!fonograma.obraId().equals(key.obraId())) {
            throw new PreRequisitosException("Fonograma não pertence à obra informada no Rol");
        }
        return fonograma;
    }

    private List<Credito> gerarCreditosAutorais(
            UUID processoId,
            WorkExecution execucao,
            BigDecimal valorAutoral,
            ObraOwnership obra,
            Instant calculadoEm) {
        List<ParticipacaoOwnership> titulares = filtrarParticipacoes(obra.titularidades(), CategoriaCredito.AUTORAL);
        validarParticipacoes(titulares, "Titularidade autoral inválida para obra " + obra.obraId());
        return gerarCreditosDaCategoria(processoId, execucao, valorAutoral, obra, titulares, calculadoEm);
    }

    private List<Credito> gerarCreditosConexos(
            UUID processoId,
            WorkExecution execucao,
            BigDecimal valorConexo,
            ObraOwnership obra,
            FonogramaOwnership fonograma,
            Instant calculadoEm) {
        List<ParticipacaoOwnership> participantes = filtrarParticipacoes(fonograma.participacoes(), CategoriaCredito.CONEXO);
        validarParticipacoes(participantes, "Participação conexa inválida para fonograma " + fonograma.fonogramaId());
        validarSubcategoriasConexas(participantes);
        return gerarCreditosDaCategoria(processoId, execucao, valorConexo, obra, participantes, calculadoEm);
    }

    private List<ParticipacaoOwnership> filtrarParticipacoes(
            List<ParticipacaoOwnership> participacoes,
            CategoriaCredito categoria) {
        return participacoes.stream()
                .filter(participacao -> participacao.categoria() == categoria)
                .toList();
    }

    private void validarParticipacoes(List<ParticipacaoOwnership> participacoes, String mensagem) {
        if (participacoes.isEmpty()) {
            throw new PreRequisitosException(mensagem);
        }

        BigDecimal total = BigDecimal.ZERO;
        Set<UUID> titulares = new HashSet<>();
        for (ParticipacaoOwnership participacao : participacoes) {
            if (participacao.percentual().compareTo(BigDecimal.ZERO) <= 0) {
                throw new PreRequisitosException(mensagem);
            }
            if (!titulares.add(participacao.titularId())) {
                throw new PreRequisitosException("Titular duplicado na mesma alocação: " + participacao.titularId());
            }
            total = total.add(participacao.percentual());
        }

        if (total.compareTo(CEM_POR_CENTO) != 0) {
            throw new PreRequisitosException(mensagem);
        }
    }

    private void validarSubcategoriasConexas(List<ParticipacaoOwnership> participantes) {
        for (ParticipacaoOwnership participante : participantes) {
            if (participante.subcategoriaConexa() == null) {
                throw new PreRequisitosException("Subcategoria conexa é obrigatória");
            }
        }
    }

    private List<Credito> gerarCreditosDaCategoria(
            UUID processoId,
            WorkExecution execucao,
            BigDecimal valorCategoria,
            ObraOwnership obra,
            List<ParticipacaoOwnership> participacoes,
            Instant calculadoEm) {
        List<AllocationDraft> drafts = participacoes.stream()
                .map(participacao -> new AllocationDraft(
                        new HolderKey(participacao.titularId()),
                        valorCategoria.multiply(participacao.percentual()).divide(CEM_POR_CENTO, ESCALA_CALCULO, RoundingMode.HALF_UP),
                        participacao.percentual()))
                .toList();
        Map<HolderKey, BigDecimal> valores = reconciliarAlocacoes(drafts, valorCategoria).stream()
                .collect(Collectors.toMap(result -> (HolderKey) result.key(), AllocationResult::valor));

        return participacoes.stream()
                .map(participacao -> criarCredito(
                        processoId,
                        obra,
                        execucao,
                        valorCategoria,
                        valores.get(new HolderKey(participacao.titularId())),
                        participacao,
                        calculadoEm))
                .toList();
    }

    private Credito criarCredito(
            UUID processoId,
            ObraOwnership obra,
            WorkExecution execucao,
            BigDecimal valorCategoria,
            BigDecimal valorCredito,
            ParticipacaoOwnership participacao,
            Instant calculadoEm) {
        Optional<MotivoRetencao> motivoRetencao = motivoRetencao(obra, participacao);
        if (motivoRetencao.isPresent()) {
            return Credito.retido(
                    processoId,
                    participacao.titularId(),
                    participacao.titularNome(),
                    execucao.key().obraId(),
                    execucao.obraTitulo(),
                    execucao.key().fonogramaId(),
                    participacao.categoria(),
                    resolveSubcategoria(participacao),
                    participacao.percentual().setScale(6, RoundingMode.HALF_UP),
                    valorCategoria,
                    valorCredito,
                    execucao.pontos().setScale(6, RoundingMode.HALF_UP),
                    motivoRetencao.get(),
                    calculadoEm,
                    calculadoEm);
        }
        return Credito.calculado(
                processoId,
                participacao.titularId(),
                participacao.titularNome(),
                execucao.key().obraId(),
                execucao.obraTitulo(),
                execucao.key().fonogramaId(),
                participacao.categoria(),
                resolveSubcategoria(participacao),
                participacao.percentual().setScale(6, RoundingMode.HALF_UP),
                valorCategoria,
                valorCredito,
                execucao.pontos().setScale(6, RoundingMode.HALF_UP),
                calculadoEm);
    }

    private Optional<MotivoRetencao> motivoRetencao(ObraOwnership obra, ParticipacaoOwnership participacao) {
        String statusObra = normalize(obra.status());
        if ("BLOQUEADA".equals(statusObra)) {
            return Optional.of(MotivoRetencao.OBRA_BLOQUEADA);
        }
        if ("PENDENTE".equals(statusObra)) {
            return Optional.of(MotivoRetencao.OBRA_PENDENTE);
        }
        if ("DEPURADA".equals(statusObra) || "DOMINIO_PUBLICO".equals(statusObra)) {
            throw new PreRequisitosException("Obra não distribuível: " + obra.obraId());
        }
        if (!"LIBERADA".equals(statusObra) && !"LIBERADO".equals(statusObra)) {
            throw new PreRequisitosException("Status de obra desconhecido para distribuição: " + obra.status());
        }
        if (!hasText(participacao.associacaoSigla())) {
            return Optional.of(MotivoRetencao.TITULAR_SEM_ASSOCIACAO);
        }
        return Optional.empty();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private SubcategoriaConexa resolveSubcategoria(ParticipacaoOwnership participacao) {
        if (participacao.categoria() == CategoriaCredito.CONEXO) {
            return Objects.requireNonNull(participacao.subcategoriaConexa(), "subcategoriaConexa must not be null");
        }
        return null;
    }

    private List<AllocationResult> reconciliarAlocacoes(List<AllocationDraft> drafts, BigDecimal target) {
        List<AllocationResult> resultados = drafts.stream()
                .map(draft -> new AllocationResult(draft.key(), draft.valorRaw().setScale(2, RoundingMode.DOWN)))
                .collect(Collectors.toCollection(ArrayList::new));
        BigDecimal soma = resultados.stream()
                .map(AllocationResult::valor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal residual = target.subtract(soma).setScale(2, RoundingMode.HALF_UP);
        if (residual.compareTo(BigDecimal.ZERO) < 0) {
            throw new PreRequisitosException("Residual de arredondamento inválido");
        }
        if (residual.compareTo(BigDecimal.ZERO) > 0) {
            int maiorIndice = encontrarMaiorDraft(drafts);
            AllocationResult maior = resultados.get(maiorIndice);
            resultados.set(maiorIndice, new AllocationResult(maior.key(), maior.valor().add(residual)));
        }
        return resultados;
    }

    private int encontrarMaiorDraft(List<AllocationDraft> drafts) {
        return drafts.stream()
                .max(Comparator
                        .comparing(AllocationDraft::valorRaw)
                        .thenComparing(AllocationDraft::pesoDesempate))
                .map(drafts::indexOf)
                .orElseThrow(() -> new PreRequisitosException("Grupo de alocação vazio"));
    }

    private int somarExecucoes(List<ExecucaoRol> execucoes) {
        return execucoes.stream()
                .mapToInt(ExecucaoRol::quantidadeExecucoes)
                .sum();
    }

    private int contarObras(List<ExecucaoRol> execucoes) {
        return (int) execucoes.stream()
                .map(ExecucaoRol::obraId)
                .distinct()
                .count();
    }

    private BigDecimal somarValores(List<Credito> creditos) {
        return creditos.stream()
                .map(Credito::getValorCredito)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal somarValores(Iterable<BigDecimal> valores) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal valor : valores) {
            total = total.add(valor);
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private record WorkKey(UUID obraId, UUID fonogramaId) {

        private boolean hasFonograma() {
            return fonogramaId != null;
        }
    }

    private record HolderKey(UUID titularId) {
    }

    private record WorkExecution(WorkKey key, String obraTitulo, BigDecimal pontos) {

        private WorkExecution somarPontos(BigDecimal novosPontos) {
            return new WorkExecution(key, obraTitulo, pontos.add(novosPontos));
        }
    }

    private record OwnershipIndex(
            Map<UUID, ObraOwnership> obras,
            Map<UUID, FonogramaOwnership> fonogramas) {
    }

    private record AllocationDraft(
            Object key,
            BigDecimal valorRaw,
            BigDecimal pesoDesempate) {
    }

    private record AllocationResult(
            Object key,
            BigDecimal valor) {
    }
}
