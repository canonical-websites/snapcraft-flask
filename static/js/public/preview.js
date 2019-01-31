import Remarkable from "remarkable";
import { default as initScreenshots } from "./snap-details/screenshots";

// Ensure markdown is set to be the same as `webapp/markdown.py` config
// doesn't include the custom ascii bullet-point (as this is legacy
// and shouldn't be promoted).
const md = new Remarkable({
  linkify: true
});
md.core.ruler.disable([
  "references",
  "footnote_tail",
  "abbr2",
  "replacements",
  "smartquotes"
]);
md.block.ruler.disable([
  "blockquote",
  "hr",
  "footnote",
  "heading",
  "lheading",
  "htmlblock",
  "table"
]);

// For the different elements we might need to change different properties
const functionMap = {
  title: "innerHTML",
  summary: "innerHTML",
  description: "innerHTML",
  website: "href",
  contact: "href",
  screenshots: "appendChild",
  license: "innerHTML"
};

// For some elements we want to hide/ show a different element to the one
// being targeted.
const hideMap = {
  screenshots: el => el.parentNode
};

// For some fields we need to transform the data.
const transformMap = {
  description: md.render.bind(md)
};

/**
 * Split the images array to separate screenshots and icon.
 * @param {object} state
 * @returns {object}
 */
function transformStateImages(state) {
  const newState = {
    icon: null,
    screenshots: []
  };

  if (state.images) {
    state.images.forEach(image => {
      if (image.type === "icon") {
        newState.icon = image.url;
      } else if (image.type === "screenshot" && image.status !== "delete") {
        newState.screenshots.push(image.url);
      }
    });
  }

  Object.keys(state).forEach(key => {
    newState[key] = state[key];
  });

  return newState;
}

/**
 * Get the details of a video, as per `webapp/store/logic.py:get_video_embed_code`
 * @param url
 * @returns {{type: string, url: string, id: string}}
 */
function getVideoDetails(url) {
  if (url.indexOf("youtube") > -1) {
    return {
      type: "youtube",
      url: url.replace("watch?v=", "embed/"),
      id: url.split("v=")[1].split("&")[0]
    };
  }
  if (url.indexOf("vimeo") > -1) {
    const splitUrl = url.split("/");
    return {
      type: "vimeo",
      url: url.replace("vimeo.com/", "player.vimeo.com/video/"),
      id: splitUrl[splitUrl.length - 1]
    };
  }
  if (url.indexOf("asciinema") > -1) {
    const splitUrl = url.split("/");
    return {
      type: "asciinema",
      url: `${url}.js`,
      id: splitUrl[splitUrl.length - 1]
    };
  }
}

/**
 * Generate a screenshot element, as needed for the details page.
 * @param image
 * @returns {HTMLElement}
 */
function screenshot(image) {
  const slide = document.createElement("div");
  slide.className = "p-carousel__item--screenshot swiper-slide";
  const img = new Image();
  img.src = image;

  slide.appendChild(img);
  return slide;
}

/**
 * Create the holder for screenshots or videos and screenshots
 * @param {Array} screenshots
 * @param {String} video
 * @returns {HTMLElement}
 */
function screenshotsAndVideos(screenshots, video) {
  if (video) {
    const videoDetails = getVideoDetails(video);
    const holder = document.createElement("div");
    holder.className = "p-snap-details__media u-equal-height";
    const col10 = document.createElement("div");
    col10.className = "col-10 u-align-text--center";
    holder.appendChild(col10);
    const videoSlide = document.createElement("div");
    videoSlide.className = "js-video-slide";
    videoSlide.setAttribute("data-video-type", videoDetails.type);
    videoSlide.setAttribute("data-video-url", videoDetails.url);
    videoSlide.setAttribute("data-video-id", videoDetails.id);
    const videoTemplate = document.querySelector(
      `#video-${videoDetails.type}-template`
    );
    if (!videoTemplate) {
      throw new Error("Video template not available");
    }
    let videoHTML = videoTemplate.innerHTML
      .split("${url}")
      .join(videoDetails.url)
      .split("${id}")
      .join(videoDetails.id);

    if (videoDetails.type === "asciinema") {
      const fakeHolder = document.createElement("div");
      fakeHolder.innerHTML = videoHTML;
      const fakeScript = fakeHolder.children[0];
      const scriptTag = document.createElement("script");
      fakeScript.getAttributeNames().forEach(attr => {
        scriptTag.setAttribute(attr, fakeScript.getAttribute(attr));
      });

      videoSlide.appendChild(scriptTag);
    } else {
      videoSlide.innerHTML = videoHTML;
    }

    col10.appendChild(videoSlide);

    if (screenshots) {
      const col2 = document.createElement("div");
      col2.className = "col-2 p-snap-details__media-items";
      if (screenshots.length > 3) {
        col2.classList.add("p-snap-details__media-items--distributed");
      }

      screenshots.map(screenshot).forEach(image => {
        col2.appendChild(image);
      });

      holder.appendChild(col2);
    }

    return holder;
  }
  if (screenshots.length === 0) {
    return null;
  }
  const holder = document.createElement("div");
  holder.className = "p-carousel u-no-margin--bottom u-no-margin--top";
  const container = document.createElement("div");
  container.className = "swiper-container";
  holder.appendChild(container);
  const wrapper = document.createElement("div");
  wrapper.className = "swiper-wrapper";
  container.appendChild(wrapper);
  const next = document.createElement("button");
  next.className = "p-carousel__next swiper-button__next";
  next.innerText = "Next";
  holder.appendChild(next);
  const prev = document.createElement("button");
  prev.className = "p-carousel__prev swiper-button__prev";
  prev.innerText = "Previous";
  holder.appendChild(prev);
  screenshots.map(screenshot).forEach(image => {
    wrapper.appendChild(image);
  });

  return holder;
}

/**
 * Get the state from localstorage for the current package
 * @param packageName
 * @returns {Object}
 */
function getState(packageName) {
  return JSON.parse(window.localStorage.getItem(packageName));
}

/**
 * Render the changes
 * @param packageName
 */
function render(packageName) {
  let state;
  try {
    state = transformStateImages(getState(packageName));
  } catch (e) {
    const notification = `<div class="p-notification--negative">
<p class="p-notification__response">Something went wrong. Please ensure you have permission to preview this snap.</p>
</div>`;
    document.querySelector(".p-snap-heading").parentNode.appendChild(
      (() => {
        const el = document.createElement("div");
        el.innerHTML = notification;
        return el;
      })()
    );
    return;
  }
  Object.keys(state).forEach(function(key) {
    if (key === "screenshots") {
      return;
    }
    const el = document.querySelector(`[data-live="${key}"]`);
    if (el && functionMap[key]) {
      let content = state[key];
      if (transformMap[key]) {
        content = transformMap[key](state[key]);
      }
      if (content !== "") {
        el[functionMap[key]] = content;

        if (hideMap[key]) {
          hideMap[key](el).classList.remove("u-hide");
        } else {
          el.classList.remove("u-hide");
        }
      } else {
        if (hideMap[key]) {
          hideMap[key](el).classList.add("u-hide");
        } else {
          el.classList.add("u-hide");
        }
      }
    }
  });

  const el = document.querySelector(`[data-live="screenshots"]`);
  if (state.video_urls !== "" || state.screenshots.length > 0) {
    el.innerHTML = "";
    el[functionMap.screenshots](
      screenshotsAndVideos(state.screenshots, state.video_urls)
    );
    hideMap.screenshots(el).classList.remove("u-hide");
  } else {
    hideMap.screenshots(el).classList.add("u-hide");
  }
  if (state.screenshots.length > 0) {
    initScreenshots("#js-snap-screenshots");
  }
}

/**
 * Initial render and storage change listener
 * @param packageName
 */
function preview(packageName) {
  window.addEventListener("storage", () => {
    // Slight delay to ensure the state has fully updated
    // There was an issue with images when it was immediate.
    setTimeout(() => {
      render(packageName);
    }, 500);
  });
  render(packageName);
}

export { preview };
