package br.com.ecad.arrecadacao.domain.services;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class SiglaSuggesterImpl implements SiglaSuggester {

    private static final Set<String> PREPOSICOES = Set.of(
            "DE", "DA", "DO", "DAS", "DOS", "EM", "NO", "NA", "A", "O", "E", "PARA", "POR", "COM");

    @Override
    public String sugerir(String nome) {
        if (nome == null || nome.isBlank()) {
            return "";
        }

        String tratado = nome.toUpperCase();
        tratado = Normalizer.normalize(tratado, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        tratado = tratado.replaceAll("[()]", " ");
        tratado = tratado.replaceAll("[^A-Z0-9\\s-]", "");
        tratado = tratado.replaceAll("\\s+", " ").trim();

        List<String> palavras = Arrays.stream(tratado.split("\\s+"))
                .filter(p -> !p.isBlank())
                .filter(p -> !PREPOSICOES.contains(p))
                .collect(Collectors.toList());

        String sigla = palavras.stream()
                .collect(Collectors.joining("_"));

        if (sigla.length() < 3) {
            if (palavras.isEmpty()) {
                String fallback = Arrays.stream(tratado.split("\\s+"))
                        .filter(p -> !p.isBlank())
                        .map(p -> p.substring(0, 1))
                        .collect(Collectors.joining("_"));
                sigla = fallback;
            } else {
                String primeira = palavras.get(0);
                int limite = Math.min(20, primeira.length());
                sigla = primeira.substring(0, limite);
            }
        }

        if (sigla.length() > 20) {
            sigla = sigla.substring(0, 20);
        }

        if (sigla.endsWith("_")) {
            sigla = sigla.substring(0, sigla.length() - 1);
        }

        return sigla;
    }
}
