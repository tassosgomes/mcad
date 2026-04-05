"""
Mock ISWC Service — responde ao POST /api/iswc com um ISWC gerado aleatoriamente.
Formato ISWC: T-XXXXXXXXX-C (T + 9 dígitos + 1 check digit)
Usado apenas para validação do simulador de carga (task 5).
"""
import json
import random
import string
from http.server import BaseHTTPRequestHandler, HTTPServer


def gerar_iswc():
    """Gera um ISWC válido no formato T-XXXXXXXXX-C."""
    digits = [random.randint(0, 9) for _ in range(9)]
    # Check digit (módulo 10)
    soma = sum((d + 1) * (i + 1) for i, d in enumerate(digits))
    check = soma % 10
    num = "".join(str(d) for d in digits)
    return f"T-{num[:3]}.{num[3:6]}.{num[6:]}-{check}"


class IswcHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/iswc":
            content_length = int(self.headers.get("Content-Length", 0))
            _ = self.rfile.read(content_length)

            iswc = gerar_iswc()
            response = json.dumps({"iswc": iswc}).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Silencia logs de acesso para manter saída limpa
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8090), IswcHandler)
    print("Mock ISWC Service rodando na porta 8090", flush=True)
    server.serve_forever()
