import bleach
import re
from collections import OrderedDict
from urllib.parse import parse_qs, urlparse


def get_searched_snaps(search_results):
    """Get search snaps from API response

    :param search_results: the body responsed by the API

    :returns: The list of the searched snaps
    """
    return (
        search_results['_embedded']['clickindex:package']
        if '_embedded' in search_results
        else []
    )


def get_pages_details(url, links):
    """Transform returned navigation links from search API from limit/offset
    to size/page

    :param url: The url to build
    :param links: The links returned by the API

    :returns: A dictionnary with all the navigation links
    """
    links_result = {}

    if('first' in links):
        links_result['first'] = convert_navigation_url(
            url,
            links['first']['href']
        )

    if('last' in links):
        links_result['last'] = convert_navigation_url(
            url,
            links['last']['href']
        )

    if('next' in links):
        links_result['next'] = convert_navigation_url(
            url,
            links['next']['href']
        )

    if('prev' in links):
        links_result['prev'] = convert_navigation_url(
            url,
            links['prev']['href']
        )

    if('self' in links):
        links_result['self'] = convert_navigation_url(
            url,
            links['self']['href']
        )

    return links_result


def convert_navigation_url(url, link):
    """Convert navigation link from offest/limit to size/page

    Example:
    - input: http://example.com?q=test&size=10&page=3
    - output: http://example2.com?q=test&limit=10&offset=30

    :param url: The new url
    :param link: The navigation url returned by the API

    :returns: The new navigation link
    """
    url_parsed = urlparse(link)
    host_url = (
        "{base_url}"
        "?q={q}&limit={limit}&offset={offset}"
    )

    url_queries = parse_qs(url_parsed.query)
    q = url_queries['q'][0]
    size = int(url_queries['size'][0])
    page = int(url_queries['page'][0])

    return host_url.format(
        base_url=url,
        q=q,
        limit=size,
        offset=size*(page-1)
    )


def split_description_into_paragraphs(unformatted_description):
    """Split a long description into a set of paragraphs. We assume each
    paragraph is separated by 2 or more line-breaks in the description.

    :param unformatted_description: The paragraph to format

    :returns: The formatted paragraphs
    """
    description = unformatted_description.strip()
    paragraphs = re.compile(r'[\n\r]{2,}').split(description)
    formatted_paragraphs = []

    # Sanitise paragraphs
    def external(attrs, new=False):
        url_parts = urlparse(attrs[(None, "href")])
        if url_parts.netloc and url_parts.netloc != 'snapcraft.io':
            if (None, "class") not in attrs:
                attrs[(None, "class")] = "p-link--external"
            elif "p-link--external" not in attrs[(None, "class")]:
                attrs[(None, "class")] += " p-link--external"
        return attrs

    for paragraph in paragraphs:
        callbacks = bleach.linkifier.DEFAULT_CALLBACKS
        callbacks.append(external)

        paragraph = bleach.clean(paragraph, tags=[])
        paragraph = bleach.linkify(paragraph, callbacks=callbacks)

        formatted_paragraphs.append(paragraph.replace('\n', '<br />'))

    return formatted_paragraphs


def convert_channel_maps(channel_maps_list):
    """
    Converts channel maps list to format easier to manipulate

    Example:
    - Input:
    [
      {
        'architecture': 'arch'
        'map': [{'info': 'release', ...}, ...],
        'track': 'track 1'
      },
      ...
    ]
    - Output:
    {
      'arch': {
        'track 1': [{'info': 'release', ...}, ...],
        ...
      },
      ...
    }

    :param channel_maps_list: The channel maps list returned by the API

    :returns: The channel maps reshaped
    """
    channel_maps = {}
    for channel_map in channel_maps_list:
        arch = channel_map.get('architecture')
        track = channel_map.get('track')
        if arch not in channel_maps:
            channel_maps[arch] = {}
        channel_maps[arch][track] = []

        for channel in channel_map['map']:
            if channel.get('info'):
                channel_maps[arch][track].append(channel)

    return channel_maps


def convert_sidebar_channel_map(channel_maps_list):
    channel_maps = {}
    total_tracks = 0
    dedupe_channels = []
    channel_cache = []

    for channel_map in channel_maps_list:
        track = channel_map['track']
        channels = channel_map['map']

        if not track in channel_maps:
            channel_maps[track] = []

        for channel in channels:
            if channel['info']:
                channel_name = channel['channel'].replace(track + '/', '')
                channel_version = channel['version']
                if not channel_name in channel_cache:
                    dedupe_channels.append({
                       'name': channel_name,
                       'safe_track_name': track.replace('.', '-'),
                       'version': channel_version
                    })
                    channel_cache.append(channel_name)

        channel_maps[track] = dedupe_channels

    ordered_channel_maps = OrderedDict(sorted(channel_maps.items(), reverse=True))

    ordered_channel_maps.move_to_end('latest', last=False)

    for track in ordered_channel_maps:
        total_tracks = total_tracks + len(ordered_channel_maps[track])

    return ordered_channel_maps, total_tracks


def get_default_channel(snap_name):
    """
    Get's the default channel of 'stable' unless the snap_name is node.

    This is a temporary* hack to get around nodejs not using 'latest'
    as their default.

    * depending on snapd and store work (not in the 18.10 cycle)
    """
    if snap_name == 'node':
        return '10/stable'

    return 'stable'
