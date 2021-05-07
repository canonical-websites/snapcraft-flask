import { format } from "date-fns";

function buildSnapsTableRow(snaps, store, currentStore) {
  const tableBody = document.querySelector("[data-js-snaps-table-body");
  const tableRowTemplate = document.querySelector("[data-js-snaps-table-row]");

  snaps.forEach((snap, index) => {
    const clone = tableRowTemplate.content.cloneNode(true);
    const publishedIn = clone.querySelector("[data-js-published-store]");
    const removeSnapForm = clone.querySelector("[data-js-remove-snap-form]");
    const removeSnapButton = clone.querySelector(
      "[data-js-remove-snap-button]"
    );

    if (index === 0) {
      publishedIn.setAttribute("rowspan", snaps.length);
      publishedIn.innerText = store.name;
    } else {
      clone.querySelector("tr").removeChild(publishedIn);
    }

    const storeName = clone.querySelector("[data-js-store-name]");

    if (snap.store === "ubuntu" && !snap.private) {
      const snapNameLink = document.createElement("a");
      snapNameLink.href = `/${snap.name}`;
      snapNameLink.innerText = snap.name;
      storeName.appendChild(snapNameLink);
    } else {
      storeName.innerText = snap.name;
    }

    if (store.id !== currentStore.id) {
      removeSnapButton.disabled = false;

      const parent = removeSnapButton.closest("[data-js-remove-snap-tooltip]");
      const child = clone.querySelector(".p-tooltip__message");
      parent.removeChild(child);

      removeSnapForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const form = event.target;
        const snapData = {
          remove: [{ name: snap.name }],
        };

        const snapsHiddenField = form.querySelector("[name='snaps']");
        snapsHiddenField.value = JSON.stringify(snapData);

        form.submit();
      });
    }

    const latestReleaseVersion = clone.querySelector(
      "[data-js-latest-release-version]"
    );
    latestReleaseVersion.innerText = snap["latest-release"].version;

    const latestReleaseDate = clone.querySelector(
      "[data-js-latest-release-date]"
    );
    latestReleaseDate.innerText = format(
      new Date(snap["latest-release"].timestamp),
      "d MMMM yyyy"
    );

    const collaborators = clone.querySelector("[data-js-collaborators]");
    const collaboratorsNames = snap.users.map((user) => user.displayname);
    let collaboratorsString = "";

    collaboratorsNames.forEach((name, index) => {
      collaboratorsString += name;

      if (index !== collaboratorsNames.length - 1) {
        collaboratorsString += ", ";
      }
    });

    collaborators.innerText = collaboratorsString;

    tableBody.appendChild(clone);
  });
}

export default buildSnapsTableRow;
