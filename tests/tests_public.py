import unittest

import responses

from app import app
from flask_testing import TestCase


# Make sure tests fail on stray responses.
responses.mock.assert_all_requests_are_fired = True


class PublicPage(TestCase):

    render_templates = False

    def create_app(self):
        my_app = app
        my_app.testing = True

        return my_app

    @responses.activate
    def test_index(self):
        url = (
            'https://api.snapcraft.io/api/v1/snaps/search'
            '?confinement=strict,classic&q=&section=featured.'
        )

        responses.add(
            responses.GET, url,
            json={}, status=200)

        response = self.client.get("/")

        assert response.status_code == 200
        self.assert_template_used('index.html')
        self.assert_context('featured_snaps', [])
        self.assert_context('error_info', {})


if __name__ == '__main__':
    unittest.main()
