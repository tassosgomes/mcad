package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rubricas")
public class RubricaController {

    private final RubricaRepository rubricaRepository;

    public RubricaController(RubricaRepository rubricaRepository) {
        this.rubricaRepository = rubricaRepository;
    }

    @GetMapping
    public ResponseEntity<List<RubricaResumoResponse>> listar() {
        var rubricas = rubricaRepository.findAll().stream()
            .map(r -> new RubricaResumoResponse(r.getId(), r.getSigla(), r.getNome()))
            .toList();
        return ResponseEntity.ok(rubricas);
    }
}
