package br.com.ecad.arrecadacao.application.ports;

public interface StorageFileClient {
    StorageFileMetadata upload(StorageUploadRequest request);
    StorageDownloadData getDownloadUrl(String fileId);
}
