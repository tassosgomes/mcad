package br.com.ecad.arrecadacao.application.ports;

public interface StorageFileClient {
    StorageFileMetadata upload(StorageUploadRequest request);
    StorageFileMetadata getMetadata(String fileId);
    StorageDownloadData getDownloadUrl(String fileId);
}
