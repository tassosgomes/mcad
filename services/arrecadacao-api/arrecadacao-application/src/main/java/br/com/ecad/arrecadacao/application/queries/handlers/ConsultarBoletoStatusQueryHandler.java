package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.BoletoStatusResponse;
import br.com.ecad.arrecadacao.application.ports.StorageFileClient;
import br.com.ecad.arrecadacao.application.queries.ConsultarBoletoStatusQuery;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ConsultarBoletoStatusQueryHandler
        implements QueryHandler<ConsultarBoletoStatusQuery, BoletoStatusResponse> {

    private static final String CLEAN_STATUS = "clean";

    private final PagamentoRepository pagamentoRepository;
    private final StorageFileClient storageFileClient;

    public ConsultarBoletoStatusQueryHandler(
            PagamentoRepository pagamentoRepository,
            StorageFileClient storageFileClient
    ) {
        this.pagamentoRepository = pagamentoRepository;
        this.storageFileClient = storageFileClient;
    }

    @Override
    @Transactional(readOnly = true)
    public BoletoStatusResponse handle(ConsultarBoletoStatusQuery query) {
        var pagamento = pagamentoRepository.findById(query.pagamentoId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Pagamento nao encontrado: " + query.pagamentoId()));
        if (pagamento.getBoletoStorageFileId() == null || pagamento.getBoletoStorageFileId().isBlank()) {
            return new BoletoStatusResponse(false);
        }
        var metadata = storageFileClient.getMetadata(pagamento.getBoletoStorageFileId());
        return new BoletoStatusResponse(CLEAN_STATUS.equalsIgnoreCase(metadata.status()));
    }
}
