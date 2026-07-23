(function (global) {
  "use strict";

  var THRESHOLDS = Object.freeze({
    FIFTEEN_SEATS: 250000,
    THIRTY_ONE_SEATS: 1000000,
    THREE_PANELS: 5000000,
    FIVE_PANELS: 25000000
  });

  function caseValue(value) {
    var parsed = Number(value);
    return isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function initialPanel(value) {
    var stake = caseValue(value);
    if (stake < THRESHOLDS.FIFTEEN_SEATS) return 7;
    if (stake < THRESHOLDS.THIRTY_ONE_SEATS) return 15;
    return 31;
  }

  function parallelPanels(value) {
    var stake = caseValue(value);
    if (stake >= THRESHOLDS.FIVE_PANELS) return 5;
    if (stake >= THRESHOLDS.THREE_PANELS) return 3;
    return 1;
  }

  function panelSet(value) {
    var panel = initialPanel(value);
    var panels = panel === 31 ? parallelPanels(value) : 1;
    return Object.freeze({
      panel: panel,
      panels: panels,
      totalSeats: panel * panels
    });
  }

  function describe(value) {
    var set = panelSet(value);
    if (set.panels === 1) return set.panel + "-seat panel";
    return set.panels + " disjoint " + set.panel + "-seat panels \u00b7 " + set.totalSeats + " seats total";
  }

  global.DemoThemisPanelSchedule = Object.freeze({
    thresholds: THRESHOLDS,
    initialPanel: initialPanel,
    parallelPanels: parallelPanels,
    panelSet: panelSet,
    describe: describe
  });
})(window);
