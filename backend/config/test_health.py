from django.test import SimpleTestCase

class HealthCheckTestCase(SimpleTestCase):
    def test_health_endpoint_status(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')
