package br.com.ecad.arrecadacao.application.ports;

public record StorageUploadRequest(
        String fileName,
        String contentType,
        byte[] content
) {}
