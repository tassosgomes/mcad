package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.BoletoDownloadResponse;
import br.com.ecad.arrecadacao.application.ports.StorageFileClient;
import br.com.ecad.arrecadacao.application.queries.BuscarBoletoDownloadQuery;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarBoletoDownloadQueryHandler
        implements QueryHandler<BuscarBoletoDownloadQuery, BoletoDownloadResponse> {

    private final PagamentoRepository pagamentoRepository;
    private final StorageFileClient storageFileClient;

    public BuscarBoletoDownloadQueryHandler(
            PagamentoRepository pagamentoRepository,
            StorageFileClient storageFileClient
    ) {
        this.pagamentoRepository = pagamentoRepository;
        this.storageFileClient = storageFileClient;
    }

    @Override
    @Transactional(readOnly = true)
    public BoletoDownloadResponse handle(BuscarBoletoDownloadQuery query) {
        var pagamento = pagamentoRepository.findById(query.pagamentoId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Pagamento nao encontrado: " + query.pagamentoId()));
        if (pagamento.getBoletoStorageFileId() == null || pagamento.getBoletoStorageFileId().isBlank()) {
            throw new IllegalStateException("Pagamento nao possui boleto armazenado");
        }
        var download = storageFileClient.getDownloadUrl(pagamento.getBoletoStorageFileId());
        return new BoletoDownloadResponse(download.downloadUrl(), download.expiresAt());
    }
}
