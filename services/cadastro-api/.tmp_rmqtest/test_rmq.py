import pika
import sys

url = 'amqp://mcad:mcad@rabbitmq.tasso.dev.br:5672/mcad'
print(f"Testing connection to {url}...")
try:
    parameters = pika.URLParameters(url)
    connection = pika.BlockingConnection(parameters)
    print("✅ RabbitMQ authentication and connection to vhost 'mcad' are OK!")
    connection.close()
except pika.exceptions.AMQPConnectionError as e:
    print(f"❌ Connection error: {e}")
except pika.exceptions.ProbableAuthenticationError as e:
    print(f"❌ Authentication error: {e}")
except Exception as e:
    print(f"❌ Other error: {e}")
