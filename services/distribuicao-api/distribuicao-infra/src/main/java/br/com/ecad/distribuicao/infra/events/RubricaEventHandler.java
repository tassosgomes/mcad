package br.com.ecad.distribuicao.infra.events;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RubricaEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(RubricaEventHandler.class);

    private final RubricaRepository rubricaRepository;

    public RubricaEventHandler(RubricaRepository rubricaRepository) {
        this.rubricaRepository = rubricaRepository;
    }

    @Transactional
    public void handle(RubricaEventPayload payload) {
        rubricaRepository.findBySigla(payload.sigla())
                .ifPresentOrElse(
                        existing -> {
                            existing.atualizar(payload.nome(), payload.exigeClassificacao(), payload.ativo());
                            rubricaRepository.upsertBySigla(existing);
                            LOGGER.info("Rubrica atualizada. sigla={} ativo={}", payload.sigla(), payload.ativo());
                        },
                        () -> {
                            Rubrica rubrica = Rubrica.criar(
                                    payload.sigla(),
                                    payload.nome(),
                                    payload.exigeClassificacao(),
                                    payload.ativo());
                            rubricaRepository.upsertBySigla(rubrica);
                            LOGGER.info(
                                    "Rubrica sincronizada. sigla={} ativo={}",
                                    payload.sigla(),
                                    payload.ativo());
                        });
    }
}
