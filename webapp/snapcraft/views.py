import flask
import requests
from dateutil import parser

from webapp.snapcraft import logic


def snapcraft_blueprint():
    snapcraft = flask.Blueprint("snapcraft", __name__)

    @snapcraft.route("/")
    def homepage():
        nps = flask.request.args.get("nps")

        livestream = logic.get_livestreams()

        return flask.render_template(
            "index.html", nps=nps, livestream=livestream
        )

    @snapcraft.route("/iot")
    def iot():
        status_code = 200

        icon_host = "https://dashboard.snapcraft.io/site_media/appmedia"
        assets_host = "https://assets.ubuntu.com/v1"

        iot_tools_and_server = [
            {
                "package_name": "mosquitto",
                "icon_url": "/".join(
                    [icon_host, "2018/08/mosquitto-logo-only.svg.png"]
                ),
                "title": "mosquitto",
                "origin": "mosquitto",
                "publisher": "Mosquitto Team",
                "developer_validation": "verified",
            },
            {
                "package_name": "node-red",
                "icon_url": "/".join([icon_host, "2017/01/nr-hex_1.png"]),
                "title": "Node-RED",
                "origin": "noderedteam",
                "publisher": "Node-RED-Team",
                "developer_validation": "verified",
            },
            {
                "package_name": "soracom-console",
                "icon_url": "/".join([icon_host, "2017/02/logo-256_1.png"]),
                "title": "soracom-console",
                "origin": "soracom",
                "publisher": "SORACOM Snap Administrator",
            },
            {
                "package_name": "nymea",
                "icon_url": "/".join(
                    [icon_host, "2018/03/icon.svg_UYFdU9y.png"]
                ),
                "title": "nymea",
                "origin": "guh GmbH developer",
                "publisher": "guh GmbH developer",
            },
            {
                "package_name": "domotzpro-agent-publicstore",
                "icon_url": "/".join(
                    [icon_host, "2019/03/new_domotz_icon.png"]
                ),
                "title": "".join(
                    [
                        "Domotz Pro Agent - ",
                        "Remote Network monitoring and Management",
                    ]
                ),
                "origin": "domotzpublicstore",
                "publisher": "Domotz",
            },
        ]

        industrial_iot = [
            {
                "package_name": "kura",
                "icon_url": "/".join([icon_host, "2018/07/icon_8BAXEYq.png"]),
                "title": "Kura™",
                "origin": "ondra",
                "publisher": "Ondrej Kubik",
            },
            {
                "package_name": "hunt-r",
                "icon_url": "/".join(
                    [icon_host, "2018/05/logo_huntr256x256.png"]
                ),
                "title": "Lantern Tech - Hunt-R Series Gateway Firmware",
                "origin": "kmorales019",
                "publisher": "Lantern Technologies",
            },
            {
                "package_name": "ammp-edge",
                "icon_url": "/".join(
                    [icon_host, "2018/08/AMMP_Logo_-_solid_in_circle_256.png"]
                ),
                "title": "ammp-edge",
                "origin": "ammp",
                "publisher": "AMMP Technologies",
            },
            {
                "package_name": "lantern-water-iot",
                "icon_url": "/".join(
                    [icon_host, "2018/05/smart_water_logo_256x256.png"]
                ),
                "title": "Lantern Tech - Smart Water Gateway Firmware",
                "origin": "kmorales019",
                "publisher": "Lantern Technologies",
            },
            {
                "package_name": "bl-gateway",
                "icon_url": "/".join(
                    [assets_host, "be6eb412-snapcraft-missing-icon.svg"]
                ),
                "title": "bl-gateway",
                "origin": "jessegrant",
                "publisher": "Jesse Grant",
            },
            {
                "package_name": "ixagent",
                "icon_url": "/".join(
                    [assets_host, "be6eb412-snapcraft-missing-icon.svg"]
                ),
                "title": "ixagent",
                "origin": "ixot",
                "publisher": "Michael Hathaway",
            },
        ]

        networking = [
            {
                "package_name": "flexran",
                "icon_url": "/".join([icon_host, "2018/04/m5g-flexran.png"]),
                "title": "flexran",
                "origin": "mosaic-5g",
                "publisher": "Mosaic 5G",
            },
            {
                "package_name": "oai-cn",
                "icon_url": "/".join([icon_host, "2018/04/m5g-oai-cn.png"]),
                "title": "oai-cn",
                "origin": "mosaic-5g",
                "publisher": "Mosaic 5G",
            },
            {
                "package_name": "oai-ran",
                "icon_url": "/".join([icon_host, "2018/04/m5g-oai-ran.png"]),
                "title": "oai-ran",
                "origin": "mosaic-5g",
                "publisher": "Mosaic 5G",
            },
            {
                "package_name": "ll-mec",
                "icon_url": "/".join([icon_host, "2018/03/m5g-llmec.png"]),
                "title": "ll-mec",
                "origin": "mosaic-5g",
                "publisher": "Mosaic 5G",
            },
            {
                "package_name": "wifi-ap",
                "icon_url": "/".join([icon_host, "2016/08/icon_16.png"]),
                "title": "wifi-ap",
                "origin": "Canonical",
                "publisher": "Canonical",
                "developer_validation": "verified",
            },
        ]

        home_gateway = [
            {
                "package_name": "openhab",
                "icon_url": "/".join([icon_host, "2017/11/favicon.png"]),
                "title": "openHAB",
                "origin": "openhab",
                "publisher": "openHAB Foundation e.V.",
            },
            {
                "package_name": "homebridge",
                "icon_url": "/".join(
                    [
                        icon_host,
                        "2018/06",
                        "40754647-531702de-6448-11e8-84c1-9f950d71d4cd.png",
                    ]
                ),
                "title": "HOMEbridge",
                "origin": "ondra",
                "publisher": "Ondrej Kubik",
            },
        ]

        board_images = [
            {
                "package_name": "pi2",
                "icon_url": "/".join([icon_host, "2015/04/berry.jpg.png"]),
                "title": "pi2",
                "origin": "Canonical",
                "publisher": "Canonical",
                "developer_validation": "verified",
            },
            {
                "package_name": "dragonboard",
                "icon_url": "/".join([icon_host, "2016/07/icon_32.png"]),
                "title": "dragonboard",
                "origin": "Canonical",
                "publisher": "Canonical",
                "developer_validation": "verified",
            },
            {
                "package_name": "pc",
                "icon_url": "/".join([icon_host, "2016/07/icon_30.png"]),
                "title": "PC",
                "origin": "Canonical",
                "publisher": "Canonical",
                "developer_validation": "verified",
            },
        ]

        context = {
            "iot_tools_and_server": iot_tools_and_server,
            "industrial_iot": industrial_iot,
            "networking": networking,
            "home_gateway": home_gateway,
            "board_images": board_images,
        }

        return (
            flask.render_template("store/categories/iot.html", **context),
            status_code,
        )

    @snapcraft.route("/about")
    def about():
        return flask.render_template("about/index.html")

    @snapcraft.route("/about/publish")
    def about_publish():
        return flask.render_template("about/publish.html")

    @snapcraft.route("/about/listing")
    def about_listing():
        return flask.render_template("about/listing.html")

    @snapcraft.route("/about/release")
    def about_release():
        return flask.render_template("about/release.html")

    @snapcraft.route("/about/publicise")
    def about_publicise():
        return flask.render_template("about/publicise.html")

    @snapcraft.route("/community")
    def community_redirect():
        return flask.redirect("/")

    @snapcraft.route("/create")
    def create_redirect():
        return flask.redirect("https://docs.snapcraft.io/build-snaps")

    @snapcraft.route("/build")
    def build():
        status_code = 200

        return flask.render_template("snapcraft/build.html"), status_code

    @snapcraft.route("/sitemap.xml")
    def sitemap():
        snaps = []
        page = 0
        url = f"https://api.snapcraft.io/api/v1/snaps/search?page={page}"
        while url:
            response = requests.get(url)
            try:
                snaps_response = response.json()
            except Exception:
                continue

            for snap in snaps_response["_embedded"]["clickindex:package"]:
                try:
                    last_udpated = (
                        parser.parse(snap["last_updated"])
                        .replace(tzinfo=None)
                        .strftime("%Y-%m-%d")
                    )
                    snaps.append(
                        {
                            "name": snap["package_name"],
                            "last_udpated": last_udpated,
                        }
                    )
                except Exception:
                    continue
            if "next" in snaps_response["_links"]:
                url = snaps_response["_links"]["next"]["href"]
            else:
                url = None

        blog_posts = []
        page = 1
        while True:
            url = (
                f"https://ubuntu.com/blog/wp-json/wp/v2/posts?"
                f"tags=2996&per_page=100&page={page}"
                f"&tags_exclude=3184%2C3265%2C3408"
            )

            response = requests.get(url)
            if response.status_code == 400:
                break

            try:
                blog_response = response.json()
            except Exception:
                continue

            for post in blog_response:
                try:
                    date = (
                        parser.parse(post["date"])
                        .replace(tzinfo=None)
                        .strftime("%Y-%m-%d")
                    )
                    blog_posts.append(
                        {"slug": post["slug"], "last_udpated": date}
                    )
                except Exception:
                    continue

            page = page + 1

        links = [
            "/store",
            "/about",
            "/about/publish",
            "/about/listing",
            "/about/release",
            "/about/publicise",
            "/blog",
            "/iot",
        ]

        xml_sitemap = flask.render_template(
            "sitemap.xml",
            base_url="https://snapcraft.io",
            snaps=snaps,
            links=links,
            blog_posts=blog_posts,
        )
        response = flask.make_response(xml_sitemap)
        response.headers["Content-Type"] = "application/xml"
        response.headers["Cache-Control"] = "public, max-age=43200"

        return response

    return snapcraft
