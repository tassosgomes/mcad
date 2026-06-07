package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.CreditoCalculadoItem;
import br.com.ecad.distribuicao.application.dto.CreditoLiberadoItem;
import br.com.ecad.distribuicao.application.dto.CreditoRetidoItem;
import br.com.ecad.distribuicao.application.dto.DemonstrativoTitularResponse;
import br.com.ecad.distribuicao.application.dto.ResumoFinanceiroResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarDemonstrativoTitularQuery;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ConsultarDemonstrativoTitularQueryHandler {

    private final ProcessoRepository processoRepository;
    private final CreditoRepository creditoRepository;

    public ConsultarDemonstrativoTitularQueryHandler(
            ProcessoRepository processoRepository,
            CreditoRepository creditoRepository) {
        this.processoRepository = Objects.requireNonNull(processoRepository, "processoRepository must not be null");
        this.creditoRepository = Objects.requireNonNull(creditoRepository, "creditoRepository must not be null");
    }

    @Transactional(readOnly = true)
    public DemonstrativoTitularResponse handle(ConsultarDemonstrativoTitularQuery query) {
        Objects.requireNonNull(query, "query must not be null");

        var processo = processoRepository.findById(query.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuicao nao encontrado: " + query.processoId()));

        List<Credito> calculados = creditoRepository.findByProcessoAndTitularAndStatus(
                query.processoId(), query.titularId(), StatusCredito.CALCULADO);
        List<Credito> retidos = creditoRepository.findByProcessoAndTitularAndStatus(
                query.processoId(), query.titularId(), StatusCredito.RETIDO);
        List<Credito> liberados = creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(
                query.processoId(), query.titularId());

        if (calculados.isEmpty() && retidos.isEmpty() && liberados.isEmpty()) {
            throw new NotFoundException(
                    "Titular " + query.titularId() + " nao possui creditos no processo " + query.processoId());
        }

        List<CreditoCalculadoItem> secao1 = calculados.stream().map(this::toCalculadoItem).toList();
        List<CreditoRetidoItem> secao2 = retidos.stream().map(this::toRetidoItem).toList();
        List<CreditoLiberadoItem> secao3 = liberados.stream().map(this::toLiberadoItem).toList();

        BigDecimal totalCalculado = sumValorCredito(calculados);
        BigDecimal totalRetido = sumValorCredito(retidos);
        BigDecimal totalLiberado = sumValorCredito(liberados);
        BigDecimal totalAReceber = totalCalculado.add(totalLiberado);

        var resumo = new ResumoFinanceiroResponse(
                format2(totalAReceber),
                format2(totalCalculado),
                format2(totalRetido),
                format2(totalLiberado),
                "0.00");

        String titularNome = !calculados.isEmpty()
                ? calculados.get(0).getTitularNome()
                : (!retidos.isEmpty()
                        ? retidos.get(0).getTitularNome()
                        : liberados.get(0).getTitularNome());

        return new DemonstrativoTitularResponse(
                processo.getId(),
                processo.getStatus(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                query.titularId(),
                titularNome,
                resumo,
                secao1,
                secao2,
                secao3,
                Collections.emptyList(),
                "0.00"
        );
    }

    private CreditoCalculadoItem toCalculadoItem(Credito c) {
        return new CreditoCalculadoItem(
                c.getObraId(),
                c.getObraTitulo(),
                c.getFonogramaId(),
                null,
                c.getCategoria() != null ? c.getCategoria().name() : null,
                c.getSubcategoriaConexa() != null ? c.getSubcategoriaConexa().name() : null,
                format6(c.getPercentualAplicado()),
                format2(c.getValorObra()),
                format2(c.getValorCredito()));
    }

    private CreditoRetidoItem toRetidoItem(Credito c) {
        return new CreditoRetidoItem(
                c.getObraId(),
                c.getObraTitulo(),
                c.getFonogramaId(),
                null,
                c.getCategoria() != null ? c.getCategoria().name() : null,
                c.getMotivoRetencao() != null ? c.getMotivoRetencao().name() : null,
                format2(c.getValorCredito()),
                c.getRetidoEm());
    }

    private CreditoLiberadoItem toLiberadoItem(Credito c) {
        return new CreditoLiberadoItem(
                c.getObraId(),
                c.getObraTitulo(),
                c.getFonogramaId(),
                null,
                c.getCategoria() != null ? c.getCategoria().name() : null,
                c.getProcessoId(),       // processoOrigemId
                c.getMotivoRetencao() != null ? c.getMotivoRetencao().name() : null,   // motivoOriginal
                format2(c.getValorCredito()),
                c.getLiberadoEm());
    }

    private static BigDecimal sumValorCredito(List<Credito> creditos) {
        return creditos.stream()
                .map(Credito::getValorCredito)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static String format2(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String format6(BigDecimal value) {
        if (value == null) {
            return "0.000000";
        }
        return value.setScale(6, RoundingMode.HALF_UP).toPlainString();
    }
}
