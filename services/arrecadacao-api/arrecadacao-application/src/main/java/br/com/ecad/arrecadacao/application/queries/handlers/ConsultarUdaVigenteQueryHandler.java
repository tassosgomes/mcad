package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.application.queries.ConsultarUdaVigenteQuery;
import br.com.ecad.arrecadacao.domain.exceptions.UdaVigenteNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
public class ConsultarUdaVigenteQueryHandler
        implements QueryHandler<ConsultarUdaVigenteQuery, UdaResponse> {

    private final UdaValorRepository udaValorRepository;

    public ConsultarUdaVigenteQueryHandler(UdaValorRepository udaValorRepository) {
        this.udaValorRepository = udaValorRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UdaResponse handle(ConsultarUdaVigenteQuery query) {
        var uda = udaValorRepository.findVigente(LocalDate.now())
            .orElseThrow(() -> new UdaVigenteNaoEncontradaException(
                "Nao ha valor de UDA vigente para a data atual (" + LocalDate.now() + ")"));

        return new UdaResponse(
            uda.getId(),
            uda.getValor().toPlainString(),
            uda.getDataVigencia(),
            uda.getCriadoEm(),
            uda.getCriadoPor()
        );
    }
}
