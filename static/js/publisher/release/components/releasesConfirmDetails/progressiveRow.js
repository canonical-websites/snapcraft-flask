import React, { Fragment } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import { updateProgressiveReleasePercentage } from "../../actions/pendingReleases";

import progressiveTypes from "./types";
import ReleaseRow from "./releaseRow";

import { ProgressiveBar, InteractiveProgressiveBar } from "../progressiveBar";

const ProgressiveRow = ({
  release,
  updateProgressiveReleasePercentage,
  type
}) => {
  if (!release.progressive) {
    return false;
  }

  let startingPercentage = 100;
  let targetPercentage = 100;
  switch (type) {
    case progressiveTypes.RELEASE:
      startingPercentage = release.progressive.percentage;
      break;
    case progressiveTypes.UPDATE:
      startingPercentage = release.revision.release.progressive.percentage;
      targetPercentage = release.progressive.percentage;
      break;
    default:
  }

  const revisionInfo = release.revision;
  const channel = release.channel;
  const updatePercentage = percentage => {
    updateProgressiveReleasePercentage(release.progressive.key, percentage);
  };

  let progress;
  if (
    type === progressiveTypes.UPDATE &&
    release.progressive.changes.some(change => change.key === "paused")
  ) {
    const paused = release.progressive.changes.find(
      change => change.key === "paused"
    ).value;
    progress = (
      <Fragment>
        <ProgressiveBar percentage={startingPercentage} />
        <span>{paused ? "Paused" : "Resumed"}</span>
      </Fragment>
    );
  } else {
    progress = (
      <Fragment>
        <InteractiveProgressiveBar
          percentage={startingPercentage}
          onChange={updatePercentage}
          targetPercentage={targetPercentage}
          minPercentage={1}
          singleDirection={type === progressiveTypes.UPDATE ? 1 : 0}
        />
        <span>
          <span className="p-tooltip--btm-right">
            <span className="p-help">{targetPercentage}% of devices</span>
            <span className="p-tooltip__message">
              Releases are delivered to devices via snap refreshes, as such, it
              may
              <br />
              take some time for devices to receive the new version. There is
              also no
              <br />
              guarentee that this release will achieve the entire target
              percentage.
            </span>
          </span>
        </span>
      </Fragment>
    );
  }

  let notes;
  if (release.previousRevisions) {
    const prevRev = release.previousRevisions[0].revision;
    const prevVer = release.previousRevisions[0].version;

    notes = `${100 -
      startingPercentage}% of devices will stay on ${prevRev} (${prevVer})`;
  }

  const displayType = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <ReleaseRow
      type={displayType}
      revisionInfo={revisionInfo}
      channel={channel}
      progress={progress}
      notes={notes}
    />
  );
};

ProgressiveRow.propTypes = {
  release: PropTypes.object,
  type: PropTypes.string,
  updateProgressiveReleasePercentage: PropTypes.func
};

const mapDispatchToProps = dispatch => {
  return {
    updateProgressiveReleasePercentage: (key, percentage) =>
      dispatch(updateProgressiveReleasePercentage(key, percentage))
  };
};

export default connect(
  null,
  mapDispatchToProps
)(ProgressiveRow);
