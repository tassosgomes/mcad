package br.com.ecad.arrecadacao.application.dto;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import java.time.Instant;
import java.util.UUID;

public record HistoricoStatusResponse(
    UUID id,
    String statusAnterior,
    String statusNovo,
    String justificativa,
    String autor,
    ActorDisplayResponse ator,
    Instant data
) {}
