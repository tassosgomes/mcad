package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.AjustarUdaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AjustarUdaCommandHandler implements CommandHandler<AjustarUdaCommand, UdaResponse> {

    private final UdaValorRepository udaValorRepository;

    public AjustarUdaCommandHandler(UdaValorRepository udaValorRepository) {
        this.udaValorRepository = udaValorRepository;
    }

    @Override
    @Transactional
    public UdaResponse handle(AjustarUdaCommand cmd) {
        // 1. Criar novo registro de UDA via factory (valida valor > 0 e dataVigencia != null)
        UdaValor udaValor = UdaValor.criar(cmd.valor(), cmd.dataVigencia(), cmd.autor());

        // 2. Persistir
        udaValor = udaValorRepository.save(udaValor);

        // 3. Mapear para response
        return toResponse(udaValor);
    }

    private UdaResponse toResponse(UdaValor uda) {
        return new UdaResponse(
            uda.getId(),
            uda.getValor().toPlainString(),
            uda.getDataVigencia(),
            uda.getCriadoEm(),
            uda.getCriadoPor()
        );
    }
}
