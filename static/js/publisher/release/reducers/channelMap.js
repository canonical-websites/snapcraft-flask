import { UNASSIGNED } from "../constants";
import {
  INIT_CHANNEL_MAP,
  SELECT_REVISION,
  RELEASE_REVISION_SUCCESS,
  CLOSE_CHANNEL_SUCCESS
} from "../actions/channelMap";

function selectRevision(state, revision) {
  // TODO: support multiple archs
  const arch = revision.architectures[0];

  state = {
    ...state,
    [UNASSIGNED]: { ...state[UNASSIGNED] }
  };

  if (
    state[UNASSIGNED][arch] &&
    state[UNASSIGNED][arch].revision === revision.revision
  ) {
    delete state[UNASSIGNED][arch];
  } else {
    state[UNASSIGNED][arch] = { ...revision };
  }
  return state;
}

function releaseRevision(state, revision, channel) {
  state = {
    ...state,
    [channel]: { ...state[channel] }
  };

  revision.architectures.forEach(arch => {
    const currentlyReleased = state[channel][arch];

    // only update revision in channel map if it changed since last time
    if (
      !currentlyReleased ||
      currentlyReleased.revision !== revision.revision
    ) {
      state[channel][arch] = { ...revision };
    }
  });

  return state;
}

function closeChannel(state, channel) {
  // if channel is already closed do nothing
  if (!state[channel]) {
    return state;
  }

  state = { ...state };
  delete state[channel];

  return state;
}

// contains channel map for each channel in current track
// also includes 'unassigned' fake channel to show selected unassigned revision
export default function channelMap(state = {}, action) {
  switch (action.type) {
    case INIT_CHANNEL_MAP:
      return {
        ...action.payload.channelMap
      };
    case SELECT_REVISION:
      return selectRevision(state, action.payload.revision);
    case "CLEAR_SELECTED_REVISIONS":
      return {
        ...state,
        [UNASSIGNED]: {}
      };
    case RELEASE_REVISION_SUCCESS:
      return releaseRevision(
        state,
        action.payload.revision,
        action.payload.channel
      );
    case CLOSE_CHANNEL_SUCCESS:
      return closeChannel(state, action.payload.channel);
    default:
      return state;
  }
}
