import React, { Fragment, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { STABLE, CANDIDATE, AVAILABLE } from "../constants";
import { getTrackingChannel } from "../releasesState";
import DevmodeRevision from "./devmodeRevision";
import HistoryIcon from "./historyIcon";
import {
  getChannelName,
  isInDevmode,
  isRevisionBuiltOnLauchpad,
  getBuildId,
  getRevisionsArchitectures
} from "../helpers";
import {
  useDragging,
  useDrop,
  DND_ITEM_REVISION,
  DND_ITEM_BUILDSET,
  Handle
} from "./dnd";

import { toggleHistory } from "../actions/history";
import { promoteRevision, undoRelease } from "../actions/pendingReleases";

import {
  getPendingChannelMap,
  getFilteredAvailableRevisionsForArch,
  hasPendingRelease,
  getRevisionsFromBuild
} from "../selectors";

const CloseChannelInfo = () => (
  <Fragment>
    close channel
    <span className="p-tooltip__message">Pending channel close</span>
  </Fragment>
);

const EmptyInfo = ({ isUnassigned, availableCount, trackingChannel }) => {
  return (
    <Fragment>
      {isUnassigned ? (
        <Fragment>
          <span className="p-release-data__info">
            <span className="p-release-data__title">Add revision</span>
            <span className="p-release-data__meta">
              {availableCount} available
            </span>
          </span>
        </Fragment>
      ) : (
        <Fragment>
          <span className="p-release-data__info--empty">
            {trackingChannel ? "↑" : "–"}
          </span>
        </Fragment>
      )}
      {!isUnassigned && (
        <span className="p-tooltip__message">
          {trackingChannel
            ? `Tracking channel ${trackingChannel}`
            : "Nothing currently released"}
        </span>
      )}
    </Fragment>
  );
};

EmptyInfo.propTypes = {
  isUnassigned: PropTypes.bool,
  availableCount: PropTypes.number,
  trackingChannel: PropTypes.string
};

const RevisionInfo = ({ revision, isPending, showVersion }) => {
  let buildIcon = null;

  if (isRevisionBuiltOnLauchpad(revision)) {
    buildIcon = <i className="p-icon--lp" />;
  }

  return (
    <Fragment>
      <span className="p-release-data__info">
        <span className="p-release-data__title">
          <DevmodeRevision revision={revision} showTooltip={false} />
        </span>
        {(showVersion || buildIcon) && (
          <span className="p-release-data__meta">
            {showVersion && revision.version} {buildIcon}
          </span>
        )}
      </span>
      <span className="p-tooltip__message">
        {isPending && "Pending release of:"}

        <div className="p-tooltip__group">
          Revision: <b>{revision.revision}</b>
          <br />
          Version: <b>{revision.version}</b>
          {revision.attributes &&
            revision.attributes["build-request-id"] && (
              <Fragment>
                <br />
                Build: <b>{revision.attributes["build-request-id"]}</b>
              </Fragment>
            )}
          {isInDevmode(revision) && (
            <Fragment>
              <br />
              {revision.confinement === "devmode" ? (
                <Fragment>
                  Confinement: <b>devmode</b>
                </Fragment>
              ) : (
                <Fragment>
                  Grade: <b>devel</b>
                </Fragment>
              )}
            </Fragment>
          )}
        </div>

        {isInDevmode(revision) && (
          <div className="p-tooltip__group">
            Revisions in devmode can’t be promoted
            <br />
            to stable or candidate channels.
          </div>
        )}
      </span>
    </Fragment>
  );
};

RevisionInfo.propTypes = {
  revision: PropTypes.object,
  isPending: PropTypes.bool,
  showVersion: PropTypes.bool
};

const ReleasesTableCell = props => {
  const {
    track,
    risk,
    arch,
    branch,
    channelMap,
    pendingChannelMap,
    pendingCloses,
    filters,
    isOverParent,
    setHoveredBuild,
    hoveredBuild
  } = props;

  const branchName = branch ? branch.branch : null;

  const channel = getChannelName(track, risk, branchName);

  // current revision to show (released or pending)
  const currentRevision =
    pendingChannelMap[channel] && pendingChannelMap[channel][arch];

  // check if there is a pending release in this cell
  const hasPendingRelease = props.hasPendingRelease(channel, arch);

  const isChannelPendingClose = pendingCloses.includes(channel);
  const isPending = hasPendingRelease || isChannelPendingClose;
  const isUnassigned = risk === AVAILABLE;
  const isActive =
    filters &&
    filters.arch === arch &&
    filters.risk === risk &&
    filters.branch === branchName;
  const isHighlighted = isPending || (isUnassigned && currentRevision);
  const trackingChannel = getTrackingChannel(channelMap, track, risk, arch);
  const availableCount = props.getAvailableCount(arch);

  const buildId = getBuildId(currentRevision);
  let buildSet = [];

  if (buildId) {
    buildSet = props.getRevisionsFromBuild(buildId);
  }
  const canDrag = currentRevision && !isChannelPendingClose;

  const item = buildSet.length
    ? {
        revisions: buildSet,
        architectures: getRevisionsArchitectures(buildSet),
        risk,
        branch,
        type: DND_ITEM_BUILDSET
      }
    : {
        revision: currentRevision,
        arch,
        risk,
        branch,
        type: DND_ITEM_REVISION
      };
  const [isDragging, isGrabbing, drag] = useDragging({
    item,
    canDrag
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [DND_ITEM_REVISION, DND_ITEM_BUILDSET],
    drop: item => {
      if (item.type === DND_ITEM_BUILDSET) {
        item.revisions.forEach(r => props.promoteRevision(r, channel));
      } else {
        props.promoteRevision(item.revision, channel);
      }
    },
    canDrop: item => {
      // can't drop on 'available revisions row'
      if (props.risk === AVAILABLE) {
        return false;
      }

      if (item.type === DND_ITEM_BUILDSET) {
        // can't drop if arch is not part of build set
        if (!item.architectures.includes(arch)) {
          return false;
        }

        // can't drop devmode to stable/candidate
        if (risk === STABLE || risk === CANDIDATE) {
          if (item.revisions.some(isInDevmode)) {
            return false;
          }
        }

        // can't drop if same revision is part of build set
        if (
          currentRevision &&
          item.revisions
            .map(revision => revision.revision)
            .includes(currentRevision.revision)
        ) {
          return false;
        }
      }

      if (item.type === DND_ITEM_REVISION) {
        // can't drop on other architectures
        if (arch !== item.arch) {
          return false;
        }

        // can't drop devmode to stable/candidate
        if (risk === STABLE || risk === CANDIDATE) {
          if (isInDevmode(item.revision)) {
            return false;
          }
        }

        // can't drop same revisions
        if (
          currentRevision &&
          item.revision.revision === currentRevision.revision
        ) {
          return false;
        }
      }

      return true;
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  function handleHistoryIconClick(arch, risk, track, branchName) {
    props.toggleHistoryPanel({ arch, risk, track, branch: branchName });
  }

  function undoClick(revision, channel, event) {
    event.stopPropagation();
    props.undoRelease(revision, channel);
  }

  const [isHovered, setIsHovered] = useState(false);
  const onMouseEnter = () => {
    setIsHovered(true);
    if (buildId) {
      setHoveredBuild(buildId);
    }
  };

  const onMouseLeave = () => {
    setIsHovered(false);
    setHoveredBuild(null);
  };

  const className = [
    "p-releases-table__cell",
    isUnassigned ? "is-unassigned" : "",
    isActive ? "is-active" : "",
    isHovered || (buildId && buildId === hoveredBuild) ? "is-hovered" : "",
    isHighlighted ? "is-highlighted" : "",
    isPending ? "is-pending" : "",
    isGrabbing ? "is-grabbing" : "",
    isDragging ? "is-dragging" : "",
    canDrag ? "is-draggable" : "",
    (canDrop && isOver) || (canDrop && isOverParent) ? "is-over" : "",
    canDrop ? "can-drop" : ""
  ].join(" ");

  return (
    <div
      ref={drop}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={drag}
        className="p-release-data p-tooltip p-tooltip--btm-center"
      >
        <Handle />
        {isChannelPendingClose ? (
          <CloseChannelInfo />
        ) : currentRevision ? (
          <RevisionInfo
            revision={currentRevision}
            isPending={hasPendingRelease}
            showVersion={props.showVersion}
          />
        ) : (
          <EmptyInfo
            isUnassigned={isUnassigned}
            availableCount={availableCount}
            trackingChannel={trackingChannel}
          />
        )}
        <HistoryIcon
          onClick={handleHistoryIconClick.bind(
            this,
            arch,
            risk,
            track,
            branchName
          )}
        />
      </div>
      {hasPendingRelease && (
        <div className="p-release-buttons">
          <button
            className="p-action-button p-tooltip p-tooltip--btm-center"
            onClick={undoClick.bind(this, currentRevision, channel)}
          >
            <i className="p-icon--close" />
            <span className="p-tooltip__message">
              Cancel promoting this revision
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

ReleasesTableCell.propTypes = {
  // state
  channelMap: PropTypes.object,
  filters: PropTypes.object,
  pendingCloses: PropTypes.array,
  pendingChannelMap: PropTypes.object,
  // compute state
  getAvailableCount: PropTypes.func,
  hasPendingRelease: PropTypes.func,
  getRevisionsFromBuild: PropTypes.func,
  // actions
  toggleHistoryPanel: PropTypes.func.isRequired,
  undoRelease: PropTypes.func.isRequired,
  promoteRevision: PropTypes.func.isRequired,
  // props
  track: PropTypes.string,
  risk: PropTypes.string,
  arch: PropTypes.string,
  showVersion: PropTypes.bool,
  branch: PropTypes.object,
  isOverParent: PropTypes.bool,
  setHoveredBuild: PropTypes.func,
  hoveredBuild: PropTypes.string
};

const mapStateToProps = state => {
  return {
    channelMap: state.channelMap,
    filters: state.history.filters,
    pendingCloses: state.pendingCloses,
    pendingChannelMap: getPendingChannelMap(state),
    getAvailableCount: arch =>
      getFilteredAvailableRevisionsForArch(state, arch).length,
    hasPendingRelease: (channel, arch) =>
      hasPendingRelease(state, channel, arch),
    getRevisionsFromBuild: buildId => getRevisionsFromBuild(state, buildId)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    toggleHistoryPanel: filters => dispatch(toggleHistory(filters)),
    undoRelease: (revision, channel) =>
      dispatch(undoRelease(revision, channel)),
    promoteRevision: (revision, channel) =>
      dispatch(promoteRevision(revision, channel))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReleasesTableCell);
