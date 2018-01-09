import requests
from pymacaroons import Macaroon


def get_authorization_header(root, discharge):
    """
    Bind root and discharge macaroons and return the authorization header.
    """

    bound = Macaroon.deserialize(root).prepare_for_request(
        Macaroon.deserialize(discharge)
    )

    return 'Macaroon root={}, discharge={}'.format(root, bound.serialize())


def is_authenticated(session):
    """
    Checks if the user is authenticated from the session
    Returns True if the user is authenticated
    """
    return (
        'openid' in session and
        'macaroon_discharge' in session and
        'macaroon_root' in session
    )


def empty_session(session):
    """
    Empty the session, used to logout.
    """
    session.pop('macaroon_root', None)
    session.pop('macaroon_discharge', None)
    session.pop('openid', None)


def get_caveat_id(root):
    """
    Returns the caveat_id generated by the SSO
    """
    caveat, = [
        c for c in Macaroon.deserialize(root).third_party_caveats()
        if c.location == 'login.staging.ubuntu.com'
    ]

    return caveat.caveat_id


def request_macaroon():
    """
    Request a macaroon from dashboard.
    Returns the macaroon.
    """
    response = requests.request(
        url='https://dashboard.staging.snapcraft.io/dev/api/acl/',
        method='POST',
        json={'permissions': [
            'edit_account',
            'package_access',
            'package_manage',
            'package_upload',
            'package_upload_request',
            'package_purchase',
            'modify_account_key']},
        headers={
            'Accept': 'application/json, application/hal+json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        }
    )

    return response.json()['macaroon']


def verify_macaroon(root, discharge, url):
    """
    Submit a request to verify a macaroon used for authorization.
    Returns the response.
    """
    authorization = get_authorization_header(root, discharge)
    response = requests.request(
        url='https://dashboard.staging.snapcraft.io/dev/api/acl/verify/',
        method='POST',
        json={
            'auth_data': {
                'authorization': authorization,
                'http_uri': url,
                'http_method': 'GET'
            }
        },
        headers={
            'Accept': 'application/json, application/hal+json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        }
    )

    return response.json()


def get_refreshed_discharge(discharge):
    """
    Get a refresh macaroon if the macaroon is not valid anymore.
    Returns the new discharge macaroon.
    """
    url = (
        'https://login.staging.ubuntu.com'
        '/api/v2/tokens/refresh'
    )
    response = requests.request(
        url=url,
        method='POST',
        json={'discharge_macaroon': discharge},
        headers={
            'Accept': 'application/json, application/hal+json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        }
    )

    return response.json()['discharge_macaroon']


def verify_headers(headers):
    """
    Returns True if the macaroon needs to be refreshed from
    the header response.
    """
    return headers.get('WWW-Authenticate') == (
            'Macaroon needs_refresh=1')


def verify_response(
        response,
        session,
        url_requested,
        url_calling,
        url_login
):
    """
    Verify if the response from the server has errors.
    Returns an JSON Object with the status_code error,
    the redirection url and the reason of the redirection.
    """
    # Redirection to same url if my macaroon needs to be refreshed
    if verify_headers(response.headers):
        session['macaroon_discharge'] = get_refreshed_discharge(
            session['macaroon_discharge']
        )

        return {
            'status_code': 307,
            'redirect': url_calling,
            'reason': 'Macaroon discharge refreshed'
        }

    if response.status_code > 400:
        verified = verify_macaroon(
            session['macaroon_root'],
            session['macaroon_discharge'],
            url_calling
        )

        # Macaroon not valid anymore, needs refresh
        if verified['account'] is None:
            empty_session(session)
            return {
                'status_code': 307,
                'redirect': url_login,
                'reason': 'Need login'
            }

        # Not authorized content
        if response.status_code == 401 and not verified['allowed']:
            return {
                'status_code': 401,
                'reason': 'Not authorized'
            }

        # The package doesn't exist
        if verified['account'] is not None and response.status_code == 404:
            return {
                'status_code': 404,
                'reason': 'Not found'
            }
