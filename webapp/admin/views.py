# Packages
import json
import flask
from canonicalwebteam.store_api.exceptions import (
    StoreApiError,
    StoreApiResponseErrorList,
)
from canonicalwebteam.store_api.stores.snapstore import SnapStoreAdmin
from flask.json import jsonify
from webapp.api.exceptions import ApiError
from webapp.decorators import login_required

# Local
from webapp.helpers import api_publisher_session
from webapp.publisher.views import _handle_error, _handle_error_list

admin_api = SnapStoreAdmin(api_publisher_session)

admin = flask.Blueprint(
    "admin", __name__, template_folder="/templates", static_folder="/static"
)


@admin.route("/admin")
@login_required
def get_stores():
    """
    In this view we get all the stores the user is an admin or we show a 403
    """
    try:
        stores = admin_api.get_stores(flask.session)
    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    if not stores:
        flask.abort(403)

    # We redirect to the first store snap list
    return flask.redirect(
        flask.url_for(".get_settings", store_id=stores[0]["id"])
    )


@admin.route("/admin/<store_id>/snaps/search")
@login_required
def get_snaps_search(store_id):
    try:
        snaps = admin_api.get_store_snaps(
            flask.session,
            store_id,
            flask.request.args.get("q"),
        )
    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return jsonify(snaps)


@admin.route("/admin/<store_id>/snaps")
@login_required
def get_store_snaps(store_id):
    try:
        stores = admin_api.get_stores(flask.session)
        store = admin_api.get_store(flask.session, store_id)
        snaps = admin_api.get_store_snaps(flask.session, store_id)

        # list of all deduped store IDs that are not current store
        other_store_ids = list(dict.fromkeys([d["store"] for d in snaps]))
        other_stores = list(
            filter(lambda id: id != store["id"], other_store_ids)
        )

        # store data for each store ID
        other_stores_data = []
        for other_store_id in other_stores:
            if other_store_id == "ubuntu":
                other_stores_data.append(
                    {"id": "ubuntu", "name": "Global store"}
                )
            else:
                store_data = admin_api.get_store(flask.session, other_store_id)
                other_stores_data.append(store_data)

    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.render_template(
        "admin/snaps.html",
        stores=stores,
        store=store,
        store_json=json.dumps(store),
        snaps=json.dumps(snaps),
        other_stores_data=json.dumps(other_stores_data),
    )


@admin.route("/admin/<store_id>/snaps/manage", methods=["POST"])
@login_required
def post_manage_store_snaps(store_id):
    snaps = json.loads(flask.request.form.get("snaps"))

    try:
        admin_api.update_store_snaps(flask.session, store_id, snaps)
        flask.flash("Changes saved", "positive")
    except StoreApiResponseErrorList as api_response_error_list:
        msgs = [
            f"{error.get('message', 'An error occurred')}"
            for error in api_response_error_list.errors
        ]

        for msg in msgs:
            flask.flash(msg, "negative")
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.redirect(
        flask.url_for(".get_store_snaps", store_id=store_id)
    )


@admin.route("/admin/<store_id>/members")
@login_required
def get_manage_members(store_id):
    try:
        stores = admin_api.get_stores(flask.session)
        store = admin_api.get_store(flask.session, store_id)
        members = admin_api.get_store_members(flask.session, store_id)
        invites = admin_api.get_store_invites(flask.session, store_id)
    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.render_template(
        "admin/manage_members.html",
        stores=stores,
        store=store,
        members=members,
        invites=invites,
        confirm_invite=False,
        email_address=None,
        admin=False,
        review=False,
        view=False,
        access=False,
    )


@admin.route("/admin/<store_id>/members", methods=["POST"])
@login_required
def post_manage_members(store_id):
    members = json.loads(flask.request.form.get("members"))

    redirect_url = ".get_manage_members"

    if flask.request.form.get("source") == "invites":
        redirect_url = ".get_invites"

    try:
        admin_api.update_store_members(flask.session, store_id, members)
        flask.flash("Changes saved", "positive")
    except StoreApiResponseErrorList as api_response_error_list:

        codes = [error.get("code") for error in api_response_error_list.errors]

        msgs = [
            f"{error.get('message', 'An error occurred')}"
            for error in api_response_error_list.errors
        ]

        for code in codes:
            admin = (flask.request.form.get("admin"),)
            review = (flask.request.form.get("review"),)
            view = (flask.request.form.get("view"),)
            access = flask.request.form.get("access")
            email_address = flask.request.form.get("invite-member-email")
            account_id = flask.request.form.get("member-account-id")

            if code == "store-users-no-match":
                if account_id:
                    return flask.redirect(
                        flask.url_for(
                            redirect_url,
                            store_id=store_id,
                            email_address=email_address,
                            admin=admin,
                            review=review,
                            view=view,
                            access=access,
                            account_id_error=True,
                        )
                    )
                else:
                    return flask.redirect(
                        flask.url_for(
                            redirect_url,
                            store_id=store_id,
                            confirm_invite=True,
                            email_address=email_address,
                            admin=admin,
                            review=review,
                            view=view,
                            access=access,
                        )
                    )
            elif code == "store-users-multiple-matches":
                return flask.redirect(
                    flask.url_for(
                        redirect_url,
                        store_id=store_id,
                        multi_user=True,
                        email_address=email_address,
                        admin=admin,
                        review=review,
                        view=view,
                        access=access,
                    )
                )
            else:
                for msg in msgs:
                    flask.flash(msg, "negative")

    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return_url = flask.url_for(".get_manage_members", store_id=store_id)

    if flask.request.form.get("source") == "invites":
        return_url = flask.url_for(".get_invites", store_id=store_id)

    return flask.redirect(return_url)


@admin.route("/admin/<store_id>/members/invite", methods=["POST"])
@login_required
def post_invite_members(store_id):
    members = json.loads(flask.request.form.get("members"))
    email_address = flask.request.form.get("invite-member-email")

    try:
        admin_api.invite_store_members(flask.session, store_id, members)
        flask.flash(f"Invite sent to {email_address}", "positive")
    except StoreApiResponseErrorList as api_response_error_list:
        msgs = [
            f"{error.get('message', 'An error occurred')}"
            for error in api_response_error_list.errors
        ]

        msgs = list(dict.fromkeys(msgs))

        for msg in msgs:
            flask.flash(msg, "negative")
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return_url = flask.url_for(".get_manage_members", store_id=store_id)

    if flask.request.form.get("source") == "invites":
        return_url = flask.url_for(".get_invites", store_id=store_id)

    return flask.redirect(return_url)


@admin.route("/admin/<store_id>/members/invite/update", methods=["POST"])
@login_required
def post_update_invites(store_id):
    invites = json.loads(flask.request.form.get("invites"))

    try:
        admin_api.update_store_invites(flask.session, store_id, invites)
        flask.flash("Changes saved", "positive")
    except StoreApiResponseErrorList as api_response_error_list:
        msgs = [
            f"{error.get('message', 'An error occurred')}"
            for error in api_response_error_list.errors
        ]

        for msg in msgs:
            flask.flash(msg, "negative")
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.redirect(flask.url_for(".get_invites", store_id=store_id))


@admin.route("/admin/<store_id>/members/invites")
@login_required
def get_invites(store_id):
    try:
        stores = admin_api.get_stores(flask.session)
        store = admin_api.get_store(flask.session, store_id)
        invites = admin_api.get_store_invites(flask.session, store_id)
    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    pending_invites = []
    expired_invites = []
    revoked_invites = []

    for invite in invites:
        if invite["status"] == "Pending":
            pending_invites.append(invite)

        if invite["status"] == "Expired":
            expired_invites.append(invite)

        if invite["status"] == "Revoked":
            revoked_invites.append(invite)

    sorted_pending_invites = sorted(
        pending_invites, key=lambda item: item["expiration-date"]
    )

    sorted_expired_invites = sorted(
        expired_invites, key=lambda item: item["expiration-date"]
    )

    sorted_revoked_invites = sorted(
        revoked_invites, key=lambda item: item["expiration-date"]
    )

    return flask.render_template(
        "admin/invites.html",
        stores=stores,
        store=store,
        pending_invites=sorted_pending_invites,
        expired_invites=sorted_expired_invites,
        revoked_invites=sorted_revoked_invites,
    )


@admin.route("/admin/<store_id>/settings")
@login_required
def get_settings(store_id):
    try:
        stores = admin_api.get_stores(flask.session)
        store = admin_api.get_store(flask.session, store_id)
    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.render_template(
        "admin/settings.html", stores=stores, store=store
    )


@admin.route("/admin/<store_id>/settings", methods=["POST"])
@login_required
def post_settings(store_id):
    settings = {}
    settings["private"] = not flask.request.form.get("is_public")
    settings["manual-review-policy"] = flask.request.form.get(
        "manual-review-policy"
    )

    try:
        admin_api.change_store_settings(flask.session, store_id, settings)
        flask.flash("Changes saved", "positive")
    except StoreApiResponseErrorList as api_response_error_list:
        msgs = [
            f"{error.get('message', 'An error occurred')}"
            for error in api_response_error_list.errors
        ]

        for msg in msgs:
            flask.flash(msg, "negative")
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.redirect(flask.url_for(".get_settings", store_id=store_id))


@admin.route("/admin/<store_id>/models")
@login_required
def get_models(store_id):
    try:
        stores = admin_api.get_stores(flask.session)
        store = admin_api.get_store(flask.session, store_id)
    except StoreApiResponseErrorList as api_response_error_list:
        return _handle_error_list(api_response_error_list.errors)
    except (StoreApiError, ApiError) as api_error:
        return _handle_error(api_error)

    return flask.render_template(
        "admin/models.html",
        stores=stores,
        store=store,
        models=[],
    )
