import pika

def try_connect(url):
    print(f"Testing URL: {url}")
    try:
        connection = pika.BlockingConnection(pika.URLParameters(url))
        print("✅ SUCCESS")
        connection.close()
    except Exception as e:
        print(f"❌ FAIL: {e}")

try_connect("amqp://gestauto:gestauto123@rabbitmq.tasso.dev.br:5672/mcad")
try_connect("amqp://mcad:mcad@rabbitmq.tasso.dev.br:5672/mcad")
