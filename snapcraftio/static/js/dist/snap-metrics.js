this.snapcraft = this.snapcraft || {};
this.snapcraft.metrics = (function () {
'use strict';

const COLORS = {
  installs: '#94519E',
  activeDevices: ['#FFE8C8','#FCBB83','#E74A37']
};

const TICKS = {
  X_FREQUENCY: 7,
  Y_FREQUENCY: 5
};

const PADDING = {
  top: 0,
  left: 72,
  bottom: 0,
  right: 0
};

/* globals moment */

/**
 * Cull Y Axis. The built in culling does not provide enough control.
 *  - hide labels that are not every X_TICK_FREQUENCY ticks.
 *  - remove month abreviation from label for sequential dates that have 
 *    the same month.
 * @param {NodeList} ticks X axis tick elements.
 */
function cullXAxis(ticks) {
  let tick, totalTicks, text, monthCache;

  for (tick = 0, totalTicks = ticks.length; tick < totalTicks; tick += 1) {
    text = ticks[tick].querySelector('text');

    if (tick % TICKS.X_FREQUENCY !== 0) {
      text.style.display = 'none';
    } else {
      ticks[tick].classList.add('active');
      text.children[0].setAttribute('fill', '#000');
      const month = text.children[0].innerHTML.split(' ');
      if (month[0] === monthCache) {
        text.children[0].innerHTML = month[1];
      }
      monthCache = month[0];
    }
  }
}

/**
 * Cull Y Axis. The built in culling does not provide enough control.
 *  - hide labels that are not every Y_TICK_FREQUENCY ticks.
 * @param {NodeList} ticks Y axis tick elements.
 */
function cullYAxis(ticks) {
  let tick, totalTicks, text;

  for (tick = 0, totalTicks = ticks.length; tick < totalTicks; tick += 1) {
    text = ticks[tick].querySelector('text');

    if (tick % TICKS.Y_FREQUENCY !== 0) {
      text.style.display = 'none';
    } else {
      ticks[tick].classList.add('active');
    }
  }
}

/**
 * Update graph x and y axis formatting.
 * @param {HTMLElement} el Graph wrapping element.
 */
function formatAxis(el) {
  const xAxis = el.querySelector('.bb-axis-x');

  let ticks = xAxis.querySelectorAll('.tick');
  cullXAxis(ticks);

  const yAxis = el.querySelector('.bb-axis-y');

  ticks = yAxis.querySelectorAll('.tick');
  cullYAxis(ticks);
}

/**
 * Format the value displayed for each tick:
 * - Jan 1
 * @param {number} x Timestamp
 */
function formatXAxisTickLabels(x) {
  return moment(x).format('MMM D');
}

/**
 * Format the value displayed for each tick:
 * - 10
 * - 1.0k
 * - 1.0m
 * @param {number} y Value of the tick
 */
function formatYAxisTickLabels(y) {
  let str = y;
  if (y >= 1000000) {
    str = (y / 1000000).toFixed(1) + 'm';
  } else if (y >= 1000) {
    str = (y / 1000).toFixed(1) + 'k';
  }
  return str;
}

/**
 * Debounce
 * @param {Function} func Function to run.
 * @param {Number} wait Time to wait between tries.
 * @param {Boolean} immediate Immediately call func.
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

class Mouse {
  constructor() {
    this.position = { x: 0, y: 0 };

    window.addEventListener('mousemove', this.updatePosition.bind(this));
  }

  updatePosition(e) {
    this.position = {
      x: e.x,
      y: e.y
    };
  }
}

const mouse = new Mouse();

/* globals moment */

/**
 * Generate the tooltip.
 * @param {Array} colors The colours used for the graph.
 * @param {Object} data The point data.
 * @returns {String} A string of HTML.
 */
function snapcraftGraphTooltip(colors, data) {
  let contents = ['<div class="p-tooltip p-tooltip--top-center">'];
  contents.push('<span class="p-tooltip__message" role="tooltip">');
  contents.push('<span class="snapcraft-graph-tooltip__title">' + moment(data[0].x).format('YYYY-MM-DD') + '</span>');
  let series = [];
  data.forEach((point, i) => {
    let color = colors[i];
    if (point.value === 0) {
      return;
    }
    series.push('<span class="snapcraft-graph-tooltip__series">');
    series.push('<span class="snapcraft-graph-tooltip__series-name">' + point.name + '</span>');
    series.push('<span class="snapcraft-graph-tooltip__series-color" style="background: ' + color + ';"></span>');
    series.push('<span class="snapcraft-graph-tooltip__series-value"> ' + point.value + '</span>');
    series.push('</span>');
  });
  if (series.length > 0) {
    contents = contents.concat(series);
  } else {
    contents.push('<span class="snapcraft-graph-tooltip__series">No data</span>');
  }
  contents.push('</span>');
  contents.push('</div>');
  return contents.join('');
}

/**
 *
 * @param {HTMLElement} graphHolder The window offset of the graphs holder.
 * @param {Object} data The  point data.
 * @param {Number} width 
 * @param {Number} height 
 * @param {HTMLElement} element The tooltip event target element.
 * @returns {Object} Left and top offset of the tooltip.  
 */
function positionTooltip(graphHolder, data, width, height, element) {
  const tooltipHalfWidth = graphHolder
    .querySelector('.p-tooltip__message')
    .clientWidth / 2;
  const elementHalfWidth = parseFloat(element.getAttribute('width')) / 2;
  const elementSixthHeight = parseFloat(element.getAttribute('height')) / 6;
  let leftModifier = -4;
  const parent = element.parentNode;
  const graphHolderOffsetTop = graphHolder.offsetTop;

  if (parent.firstChild === element) {
    leftModifier -= 3;
  } else if (parent.lastChild === element) {
    leftModifier += 4;
  }

  return {
    left: Math.floor(
      parseInt(element.getAttribute('x')
    ) + tooltipHalfWidth + elementHalfWidth) + leftModifier,
    top: Math.floor(
      (mouse.position.y - graphHolderOffsetTop) + window.scrollY - elementSixthHeight
    )
  };
}

/* globals bb */

function showGraph(el) {
  formatAxis(el);
  el.style.opacity = 1;
}

function installsMetrics(days, installs) {
  const el = document.getElementById('installs_metrics');

  const installsMetrics = bb.generate({
    bindto: '#installs_metrics',
    legend: {
      hide: true
    },
    padding: PADDING,
    tooltip: {
      contents: snapcraftGraphTooltip.bind(this, [COLORS.installs]),
      position: positionTooltip.bind(this, el)
    },
    transition: {
      duration: 0
    },
    point: {
      focus: false
    },
    axis: {
      x: {
        tick: {
          culling: false,
          outer: true,
          format: formatXAxisTickLabels
        }
      },
      y: {
        tick: {
          format: formatYAxisTickLabels
        }
      }
    },
    bar: {
      width: 4
    },
    resize: {
      auto: false
    },
    data: {
      colors: COLORS,
      type: 'bar',
      x: 'x',
      columns: [
        days,
        installs
      ]
    }
  });

  showGraph(el);

  // Extra events
  let elWidth = el.clientWidth;

  const resize = debounce(function () {
    if (el.clientWidth !== elWidth) {
      el.style.opacity = 0;
      debounce(function () {
        installsMetrics.resize();
        showGraph(el);
        elWidth = el.clientWidth;
      }, 100)();
    }
  }, 500);

  window.addEventListener('resize', resize);

  return installsMetrics;
}

/* globals bb */

function showGraph$1(el) {
  formatAxis(el);
  el.style.opacity = 1;
}

function findStart(data) {
  for (let i = 0, ii = data.length; i < ii; i += 1) {
    if (data[i] !== 0) {
      return i;
    }
  }
  return 0;
}

function findEnd(data) {
  for (let i = data.length; i > 0; i -= 1) {
    if (data[i] !== 0) {
      return i;
    }
  }
  return data.length - 1;
}

function getHighest(data) {
  let highestIndex = 0;
  let highestValue = 0;
  for (let i = 0, ii = data.length ; i < ii; i += 1) {
    if (data[i] > highestValue) {
      highestValue = data[i];
      highestIndex = i;
    }
  }

  return {
    index: highestIndex,
    value: highestValue
  };
}

const labelPosition = function(graphEl, labelText, data, isFirst, isLast) {
  const start = findStart(data);
  const end = findEnd(data);
  const highestIndex = getHighest(data).index;

  const labelClass = labelText.replace('.', '-');
  const area = graphEl.querySelector(`.bb-areas-${labelClass}`);
  const bbox = area.getBBox();
  const sliceWidth = Math.round(bbox.width / data.length);

  const width = sliceWidth * (end - start);
  let leftPadding = (width / 12);
  
  if (isLast && highestIndex > end - 3) {
    leftPadding = -(width / 12);
  }

  const highestLeft = parseInt(
    graphEl.querySelector(`.bb-event-rect-${highestIndex}`).getAttribute('x'),
    10
  );

  let label = document.querySelector(`[data-version="${labelText}"]`);
  if (!label) {
    label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('data-version', labelText);
    label.setAttribute('stroke', '#000');
    label.setAttribute('x', highestLeft + leftPadding);
    label.setAttribute('y', bbox.y + (bbox.height / 2));
    const labelSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    labelSpan.innerHTML = labelText;
    label.appendChild(labelSpan);
    area.appendChild(label);
  } else {
    label.setAttribute('x', highestLeft + leftPadding);
    label.setAttribute('y', bbox.y + (bbox.height / 2));
  }
};

const positionLabels = function(el, activeDevices) {
  activeDevices.forEach((points, index) => {
    let _points = points.slice(0);
    const version = _points.shift();
    labelPosition(el, version, _points, index === 0, index === activeDevices.length - 1);
  });
};

function activeDevices(days, activeDevices) {
  const el = document.getElementById('active_devices');

  let types = {};
  let colors = {};
  let _colors = COLORS.activeDevices.slice(0);

  const group = activeDevices.map(version => {
    const name = version[0];
    types[name] = 'area-spline';
    colors[name] = _colors.shift();
    return name;
  });

  const activeDevicesMetrics = bb.generate({
    bindto: '#active_devices',
    legend: {
      hide: true
    },
    padding: PADDING,
    tooltip: {
      contents: snapcraftGraphTooltip.bind(this, COLORS.activeDevices),
      position: positionTooltip.bind(this, el)
    },
    transition: {
      duration: 0
    },
    point: {
      focus: false,
      show: false
    },
    axis: {
      x: {
        tick: {
          culling: false,
          outer: true,
          format: formatXAxisTickLabels
        }
      },
      y: {
        tick: {
          format: formatYAxisTickLabels
        }
      }
    },
    resize: {
      auto: false
    },
    data: {
      colors: colors,
      types: types,
      groups: [
        group
      ],
      x: 'x',
      columns: [days].concat(activeDevices)
    }
  });

  showGraph$1(el);
  positionLabels(el, activeDevices);

  // Extra events
  let elWidth = el.clientWidth;

  const resize = debounce(function () {
    if (el.clientWidth !== elWidth) {
      el.style.opacity = 0;
      debounce(function () {
        activeDevicesMetrics.resize();
        showGraph$1(el);
        positionLabels(el, activeDevices);
        elWidth = el.clientWidth;
      }, 100)();
    }
  }, 500);

  window.addEventListener('resize', resize);

  return activeDevicesMetrics;
}

/* globals d3 bb moment */

/**
 * Render all metrics
 * @param {Object} metrics An object of metrics from the API.
 */
function renderMetrics(metrics) {
  if (!d3 || !bb) {
    return false;
  }

  let days = metrics.installs.buckets;
  // Convert to moment object.
  days = days.map(function (day) {
    return moment(day);
  });
  // Prepend 'x'.
  days.unshift('x');


  // Installs Metrics
  let installs = metrics.installs.series[0].values;
  // Prepend 'installs'.
  installs.unshift(metrics.installs.series[0].name);

  installsMetrics(days, installs);

  // Active devices
  const activeDevicesSeries = metrics['active_devices'].series;
  let activeDevices$$1 = [];
  activeDevicesSeries.forEach(series => {
    let fullSeries = series.values;
    fullSeries.unshift(series.name);
    activeDevices$$1.push(fullSeries);
  });

  activeDevices(days, activeDevices$$1);
}

var metrics = {
  renderMetrics: renderMetrics
};

return metrics;

}());
