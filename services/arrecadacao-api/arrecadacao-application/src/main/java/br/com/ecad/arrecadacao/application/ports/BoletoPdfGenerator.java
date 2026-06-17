package br.com.ecad.arrecadacao.application.ports;

public interface BoletoPdfGenerator {
    byte[] generate(BoletoPdfData data);
}
