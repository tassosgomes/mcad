INSERT INTO arrecadacao.rubricas (id, sigla, nome, exige_classificacao) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RADIO', 'Rádio AM/FM', FALSE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'TV_ABERTA', 'TV Aberta', TRUE),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'TV_FECHADA', 'TV Fechada', TRUE),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'CINEMA', 'Cinema', TRUE),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'VOD', 'Streaming Vídeo (VOD)', TRUE),
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'STREAMING_AUDIO', 'Streaming Áudio', FALSE),
    ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'SHOW', 'Show', FALSE)
ON CONFLICT (sigla) DO NOTHING;
