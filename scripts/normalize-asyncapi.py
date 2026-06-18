#!/usr/bin/env python3
"""
normalize-asyncapi.py — torna o AsyncAPI gerado pelo Saunter (.NET) "Microcks-ready".

O Saunter 0.13 emite o binding AMQP do canal como um $ref
(`bindings: {$ref: '#/components/channelBindings/amqp'}`) e nao suporta
`examples:` de mensagem via atributo. O Microcks/async-minion:
  (a) NAO resolve binding via $ref (erra "type null") -> precisa de binding INLINE;
  (b) so produz mock util quando a mensagem tem `examples[].payload`.

Este pos-processador resolve os dois pontos sem sujar o codigo nem o spec gerado:
  1. Inlina o binding de cada canal (resolve o $ref para o objeto concreto).
  2. Mescla exemplos CloudEvents de um sidecar opcional
     (contracts/<svc>/async-examples.yaml) sobre as mensagens.

Uso (no export-contracts.sh):
  cat asyncapi.json | normalize-asyncapi.py [sidecar.yaml] > asyncapi.json

E deterministico/idempotente: rodar de novo sobre a saida produz o mesmo arquivo,
para o gate de drift (--check) comparar transformado-vs-commitado de forma estavel.
"""
import json
import sys


def resolve_pointer(doc, ref):
    """Resolve um JSON Pointer interno simples (#/a/b/c)."""
    if not ref.startswith("#/"):
        return None
    node = doc
    for part in ref[2:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def inline_channel_bindings(doc):
    for channel in doc.get("channels", {}).values():
        bindings = channel.get("bindings")
        if isinstance(bindings, dict) and set(bindings.keys()) == {"$ref"}:
            resolved = resolve_pointer(doc, bindings["$ref"])
            if resolved is not None:
                # copia profunda via round-trip JSON (objetos pequenos)
                channel["bindings"] = json.loads(json.dumps(resolved))


def merge_examples(doc, sidecar):
    messages = doc.get("components", {}).get("messages", {})
    for msg_name, spec in (sidecar.get("messages") or {}).items():
        msg = messages.get(msg_name)
        if msg is None:
            print(f"AVISO: mensagem '{msg_name}' do sidecar nao existe no spec", file=sys.stderr)
            continue
        if "contentType" in spec:
            msg["contentType"] = spec["contentType"]
        payload = spec.get("payload")
        if payload is not None:
            msg["examples"] = [{
                "name": spec.get("name", msg_name),
                "summary": spec.get("summary", f"{msg_name} (exemplo de mock)"),
                "payload": payload,
            }]
    return doc


def main():
    doc = json.load(sys.stdin)
    inline_channel_bindings(doc)

    if len(sys.argv) > 1 and sys.argv[1]:
        import yaml  # importado so quando ha sidecar
        with open(sys.argv[1], encoding="utf-8") as fh:
            sidecar = yaml.safe_load(fh) or {}
        merge_examples(doc, sidecar)

    json.dump(doc, sys.stdout, indent=2, ensure_ascii=False, sort_keys=True)
    print()


if __name__ == "__main__":
    main()
