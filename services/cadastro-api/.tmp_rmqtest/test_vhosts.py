import pika

def try_connect(url):
    print(f"Testing URL: {url}")
    try:
        connection = pika.BlockingConnection(pika.URLParameters(url))
        print("✅ SUCCESS")
        connection.close()
    except Exception as e:
        print(f"❌ FAIL: {e}")

try_connect("amqp://mcad:mcad@rabbitmq.tasso.dev.br:5672/%2F")
try_connect("amqp://mcad:mcad@rabbitmq.tasso.dev.br:5672/cadastro")
try_connect("amqp://gestauto:gestauto123@rabbitmq.tasso.dev.br:5672/%2F")
try_connect("amqp://guest:guest@rabbitmq.tasso.dev.br:5672/%2F")
