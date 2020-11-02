// ==UserScript==
// @name       Street Vector Layer
// @namespace  wme-champs-it
// @version    4.9.4.2
// @description  Adds a vector layer for drawing streets on the Waze Map editor
// @include    /^https:\/\/(www|beta)\.waze\.com(\/\w{2,3}|\/\w{2,3}-\w{2,3}|\/\w{2,3}-\w{2,3}-\w{2,3})?\/editor\b/
// @downloadURL  https://github.com/bedo2991/svl/raw/develop/svl.user.js
// @supportURL https://www.waze.com/forum/viewtopic.php?f=819&t=149535
// @require    https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @icon       https://raw.githubusercontent.com/bedo2991/svl/master/logo_noText.png
// @author     bedo2991
// @grant    GM_setClipboard
// @copyright  2015+, bedo2991
// ==/UserScript==

// @updateURL  http://code.waze.tools/repository/475e72a8-9df5-4a82-928c-7cd78e21e88d.user.js

/*jslint browser: true*/
/*jslint white: true */
/*jslint nomen: true */ //for variable starting with _
/*jshint esversion: 6*/
/* jshint nocomma:true, maxcomplexity: 10, freeze: true, forin: true, latedef: nofunc, curly: true, bitwise: true, undef: true, unused: true, browser: true, strict: true, devel:true*/
/* globals I18n:false, W:false, OpenLayers:false, WazeWrap:false, GM_info:false, $:false, GM_setClipboard:false */


//Code minifier: https://closure-compiler.appspot.com/home
//debugger;
(function () {
    "use strict";
    const consoleDebug = localStorage.getItem("svlDebugOn") === "true" ? (...args) => {
        for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === "string") {
                console.log(`[SVL] ${GM_info.script.version}: ${args[i]}`);
            } else {
                console.dir(args[i]);
            }
        }
    } : () => { };

    let autoLoadInterval = null,
        clutterConstant,
        thresholdDistance,
        streetStyles = [],
        streetVectorLayer,
        nodesVector,
        labelsVector,
        preferences,
        WMERoadLayer,
        SVLAutomDisabled,
        OLMap;

    const ROAD_LAYER = 0;
    const SVL_LAYER = 1;
    const layerCheckboxes = {
        ROAD_LAYER: null,
        SVL_LAYER: null
    };

    const clutterMax = 700;
    const fontSizeMax = 32;
    const superScript = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
    const svlIgnoredStreets = {
        8: true,
        10: true,
        16: true,
        17: true,
        19: true,
        20: true,
        22: true,
    };

    //Styles that are not changeable in the preferences:
    const validatedStyle = {
        strokeColor: "#F53BFF",
        strokeWidth: 3,
        strokeDashstyle: "solid",
    };

    const roundaboutStyle = {
        strokeColor: "#111111",
        strokeWidth: 1,
        strokeDashstyle: "dash",
        strokeOpacity: 0.6,
    };

    const nodeStyle = {
        stroke: false,
        fillColor: "#0015FF",
        fillOpacity: 0.9,
        pointRadius: 3,
        pointerEvents: "none"
    };

    const nodeStyleDeadEnd = {
        stroke: false,
        fillColor: "#C31CFF",
        fillOpacity: 0.9,
        pointRadius: 3,
        pointerEvents: "none"
    };

    const unknownDirStyle = {
        graphicName: "x",
        strokeColor: "#f00",
        strokeWidth: 1.5,
        fillColor: "#FFFF40",
        fillOpacity: 0.7,
        pointRadius: 7,
        pointerEvents: "none"
    };

    const geometryNodeStyle = {
        stroke: false,
        fillColor: "#000",
        fillOpacity: 0.5,
        pointRadius: 3.3,
        graphicZIndex: 179,
        pointerEvents: "none"
    };

    const nonEditableStyle = {
        strokeColor: "#000",
        //strokeWidth: 2, 20%
        strokeDashstyle: "solid",
    };
    const tunnelFlagStyle2 = {
        strokeColor: "#C90",
        strokeDashstyle: "longdash",
    };
    const tunnelFlagStyle1 = {
        strokeColor: "#fff",
        strokeOpacity: 0.8,
        strokeDashstyle: "longdash",
    };

    //End of global variable declaration
    function isFarZoom(zoom = OLMap.zoom) {
        return zoom < preferences.switchZoom;
    }

    function svlGlobals() {
        OLMap = W.map.getOLMap();
        preferences = null;
        OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    }

    function svlWazeBits() {
        ////Utilities variable to avoid writing long names
        if (W !== undefined) {
            //wazeMap = unsafeWindow.W.map;
            if (W.map !== undefined) {
                if (W.model !== undefined) {
                    return;
                }
            }
        }
        throw "Model Not ready";
    }

    function refreshWME() {
        if (W.model.actionManager.unsavedActionsNum() === 0 && !WazeWrap.hasSelectedFeatures() && document.querySelectorAll(".place-update-edit.show").length === 0) {
            W.controller.reload();
        }
    }

    function setLayerVisibility(layer, visibility) {
        //Toggle layers
        if (layer === SVL_LAYER) {
            consoleDebug("Changing SVL Layer visibility to " + visibility);
            streetVectorLayer.setVisibility(visibility);
        } else {
            if (WMERoadLayer) {
                consoleDebug("Changing Road Layer visibility to " + visibility);
                WMERoadLayer.setVisibility(visibility);
            }
            else {
                console.warn("SVL: cannot toggle the WME's road layer");
            }
        }
        //Toggle checkboxes
        if (!layerCheckboxes[layer]) {
            consoleDebug("Initialising layer " + layer);
            layerCheckboxes[layer] = document.getElementById(layer === SVL_LAYER ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road");
            if (!layerCheckboxes[layer]) {
                console.warn("SVL: cannot find checkbox for layer number " + layer);
                return;
            }
        }
        console.dir(layerCheckboxes[layer]);
        layerCheckboxes[layer].checked = visibility;
    }

    //TODO
    function hasToBeSkipped(roadid) {
        return preferences.hideMinorRoads && OLMap.zoom === 3 && svlIgnoredStreets[roadid] === true;
    }

    function savePreferences(preferences) {
        consoleDebug("savePreferences");
        preferences.version = GM_info.script.version;
        localStorage.setItem("svl", JSON.stringify(preferences));
    }


    function saveDefaultPreferences() {
        consoleDebug("saveDefaultPreferences");
        loadPreferences(true);
    }

    const defaultSegmentWidhtMeters = {
        1: 5.0,// "Street",
        2: 5.5,//"Primary Street",
        3: 22.5,//"Freeway",
        4: 6.0,//"Ramp",
        5: 2.0,//"Walking Trail",
        6: 10.0,//"Major Highway",
        7: 9.0,//"Minor Highway",
        8: 4.0,//"Dirt Road",
        10: 2.0,//"Pedestrian Boardwalk",
        15: 8.0,//"Ferry",
        16: 2.0,//"Stairway",
        17: 5.0,//"Private Road",
        18: 10.0,//"Railroad",
        19: 5.0,//"Runway",
        20: 5.0,//"Parking Lot Road",
        22: 3.0//"Alley"
        /*"service": 21,*/
    };

    function getWidth({ segmentWidth, roadType, twoWay }) {
        //If in close zoom and user enabled the realsize mode
        if (preferences.realsize) {
            //If the segment has a widht set, use it
            if (segmentWidth) {
                return (twoWay ? segmentWidth : (segmentWidth * 0.6));
            } else {
                return (twoWay ? defaultSegmentWidhtMeters[roadType] : (defaultSegmentWidhtMeters[roadType] * 0.6));
            }
        } else {
            //Use the value stored in the preferences //TODO: parseInt should not be needed
            return parseInt(streetStyles[roadType].strokeWidth, 10);
        }
    }


    function loadPreferences(overwrite = false) {
        let oldUser = true;
        let loadedPreferences = null;

        if (overwrite === true) {
            localStorage.removeItem("svl");
        } else {
            loadedPreferences = JSON.parse(localStorage.getItem("svl"));
        }

        //consoleDebug("Loading preferences");
        if (loadedPreferences === null) {
            if (overwrite) {
                consoleDebug("Overwriting existing preferences");
            } else {
                oldUser = false;
                consoleDebug("Creating new preferences for the first time");
            }
        }
        //else: preference read from localstorage

        preferences = {};
        preferences.autoReload = {};
        //jshint ignore: start
        preferences.autoReload.interval = loadedPreferences?.autoReload?.interval || 60000;
        preferences.autoReload.enabled = loadedPreferences?.autoReload?.enabled || false;

        preferences.showSLSinglecolor = loadedPreferences?.showSLSinglecolor || false;
        preferences.SLColor = loadedPreferences?.SLColor || "#ffdf00";

        preferences.fakelock = loadedPreferences?.fakelock || WazeWrap?.User?.Rank() || 6; // jshint ignore:line
        preferences.hideMinorRoads = loadedPreferences?.hideMinorRoads || true;
        preferences.showDashedUnverifiedSL = loadedPreferences?.showDashedUnverifiedSL || true;
        preferences.showSLcolor = loadedPreferences?.showSLcolor || true;
        preferences.showSLtext = loadedPreferences?.showSLtext || true;
        //preferences.version = GM_info.script.version; Automatically added by savePreferences
        preferences.disableRoadLayers = loadedPreferences?.disableRoadLayers || true;
        preferences.startDisabled = loadedPreferences?.startDisabled || false;
        preferences.clutterConstant = loadedPreferences?.clutterConstant || 200;
        preferences.labelOutlineWidth = loadedPreferences?.labelOutlineWidth || 3;
        preferences.closeZoomLabelSize = loadedPreferences?.closeZoomLabelSize || 14;
        preferences.farZoomLabelSize = loadedPreferences?.farZoomLabelSize || 12;
        preferences.useWMERoadLayerAtZoom = loadedPreferences?.useWMERoadLayerAtZoom || 1;
        preferences.switchZoom = loadedPreferences?.switchZoom || 5;

        preferences.arrowDeclutter = loadedPreferences?.arrowDeclutter || 140;

        preferences.showUnderGPSPoints = loadedPreferences?.showUnderGPSPoints || false;
        preferences.routingModeEnabled = loadedPreferences?.routingModeEnabled || false;
        preferences.realsize = loadedPreferences?.realsize || false;
        preferences.showANs = loadedPreferences?.showANs || false;
        
        preferences.streets = [];
        //Street: 1
        preferences.streets[1] = {
            strokeColor: loadedPreferences?.streets[1]?.strokeColor || "#FFFFFF",
            strokeWidth: loadedPreferences?.streets[1]?.strokeWidth || 10,
            strokeDashstyle: loadedPreferences?.streets[1]?.strokeDashstyle || "solid",
        };
        //Parking: 20
        preferences.streets[20] = {
            strokeColor: loadedPreferences?.streets[20]?.strokeColor || "#2282ab",
            strokeWidth: loadedPreferences?.streets[20]?.strokeWidth || 9,
            strokeDashstyle: loadedPreferences?.streets[20]?.strokeDashstyle || "solid",
        };
        //Ramp: 4
        preferences.streets[4] = {
            strokeColor: loadedPreferences?.streets[4]?.strokeColor || "#3FC91C",
            strokeWidth: loadedPreferences?.streets[4]?.strokeWidth || 11,
            strokeDashstyle: loadedPreferences?.streets[4]?.strokeDashstyle || "solid",
        };
        //Freeway: 3
        preferences.streets[3] = {
            strokeColor: loadedPreferences?.streets[3]?.strokeColor || "#387FB8",
            strokeWidth: loadedPreferences?.streets[3]?.strokeWidth || 18,
            strokeDashstyle: loadedPreferences?.streets[3]?.strokeDashstyle || "solid",
        };
        //Minor: 7
        preferences.streets[7] = {
            strokeColor: loadedPreferences?.streets[7]?.strokeColor || "#ECE589",
            strokeWidth: loadedPreferences?.streets[7]?.strokeWidth || 14,
            strokeDashstyle: loadedPreferences?.streets[7]?.strokeDashstyle || "solid",
        };
        //Major: 6
        preferences.streets[6] = {
            strokeColor: loadedPreferences?.streets[6]?.strokeColor || "#C13040",
            strokeWidth: loadedPreferences?.streets[6]?.strokeWidth || 16,
            strokeDashstyle: loadedPreferences?.streets[6]?.strokeDashstyle || "solid",
        };
        //Stairway: 16
        preferences.streets[16] = {
            strokeColor: loadedPreferences?.streets[16]?.strokeColor || "#B700FF",
            strokeWidth: loadedPreferences?.streets[16]?.strokeWidth || 5,
            strokeDashstyle: loadedPreferences?.streets[16]?.strokeDashstyle || "dash",
        };
        //Walking: 5
        preferences.streets[5] = {
            strokeColor: loadedPreferences?.streets[5]?.strokeColor || "#00FF00",
            strokeWidth: loadedPreferences?.streets[5]?.strokeWidth || 5,
            strokeDashstyle: loadedPreferences?.streets[5]?.strokeDashstyle || "dash",
        };
        //Dirty: 8
        preferences.streets[8] = {
            strokeColor: loadedPreferences?.streets[8]?.strokeColor || "#82614A",
            strokeWidth: loadedPreferences?.streets[8]?.strokeWidth || 7,
            strokeDashstyle: loadedPreferences?.streets[8]?.strokeDashstyle || "solid",
        };
        //Ferry: 15
        preferences.streets[15] = {
            strokeColor: loadedPreferences?.streets[15]?.strokeColor || "#FF8000",
            strokeWidth: loadedPreferences?.streets[15]?.strokeWidth || 5,
            strokeDashstyle: loadedPreferences?.streets[15]?.strokeDashstyle || "dashdot",
        };
        //Railroad: 18
        preferences.streets[18] = {
            strokeColor: loadedPreferences?.streets[18]?.strokeColor || "#FFFFFF",
            strokeWidth: loadedPreferences?.streets[18]?.strokeWidth || 8,
            strokeDashstyle: loadedPreferences?.streets[18]?.strokeDashstyle || "dash",
        };
        //Private: 17
        preferences.streets[17] = {
            strokeColor: loadedPreferences?.streets[17]?.strokeColor || "#00FFB3",
            strokeWidth: loadedPreferences?.streets[17]?.strokeWidth || 7,
            strokeDashstyle: loadedPreferences?.streets[17]?.strokeDashstyle || "solid",
        };
        //Alley: 22
        preferences.streets[22] = {
            strokeColor: loadedPreferences?.streets[22]?.strokeColor || "#C6C7FF",
            strokeWidth: loadedPreferences?.streets[22]?.strokeWidth || 6,
            strokeDashstyle: loadedPreferences?.streets[22]?.strokeDashstyle || "solid",
        };
        //Runway: 19
        preferences.streets[19] = {
            strokeColor: loadedPreferences?.streets[19]?.strokeColor || "#00FF00",
            strokeWidth: loadedPreferences?.streets[19]?.strokeWidth || 5,
            strokeDashstyle: loadedPreferences?.streets[19]?.strokeDashstyle || "dashdot",
        };
        //Primary: 2
        preferences.streets[2] = {
            strokeColor: loadedPreferences?.streets[2]?.strokeColor || "#CBA12E",
            strokeWidth: loadedPreferences?.streets[2]?.strokeWidth || 12,
            strokeDashstyle: loadedPreferences?.streets[2]?.strokeDashstyle || "solid",
        };
        //Pedestrian: 10
        preferences.streets[10] = {
            strokeColor: loadedPreferences?.streets[10]?.strokeColor || "#0000FF",
            strokeWidth: loadedPreferences?.streets[10]?.strokeWidth || 5,
            strokeDashstyle: loadedPreferences?.streets[10]?.strokeDashstyle || "dash",
        };
        //Red segments (without names)
        preferences.red = {
            strokeColor: loadedPreferences?.red?.strokeColor || "#FF0000",
            strokeWidth: loadedPreferences?.red?.strokeWidth || 6,
            strokeDashstyle: loadedPreferences?.red?.strokeDashstyle || "solid",
        };

        preferences.roundabout = {
            strokeColor: loadedPreferences?.roundabout?.strokeColor || "#111",
            strokeWidth: loadedPreferences?.roundabout?.strokeWidth || 1,
            strokeDashstyle: loadedPreferences?.roundabout?.strokeDashstyle || "dash",
        };
        preferences.lanes = {
            strokeColor: loadedPreferences?.lanes?.strokeColor || "#454443",
            strokeWidth: loadedPreferences?.lanes?.strokeWidth || 3,
            strokeDashstyle: loadedPreferences?.lanes?.strokeDashstyle || "dash",
        };
        preferences.toll = {
            strokeColor: loadedPreferences?.toll?.strokeColor || "#00E1FF",
            strokeWidth: loadedPreferences?.toll?.strokeWidth || 2,
            strokeDashstyle: loadedPreferences?.toll?.strokeDashstyle || "solid"
        };
        preferences.closure = {
            strokeColor: loadedPreferences?.closure?.strokeColor || "#FF00FF",
            strokeWidth: loadedPreferences?.closure?.strokeWidth || 4,
            strokeDashstyle: loadedPreferences?.closure?.strokeDashstyle || "dash",
        };
        preferences.headlights = {
            strokeColor: loadedPreferences?.headlights?.strokeColor || "#bfff00",
            strokeWidth: loadedPreferences?.headlights?.strokeWidth || 3,
            strokeDashstyle: loadedPreferences?.headlights?.strokeDashstyle || "dot",
        };
        preferences.restriction = {
            strokeColor: loadedPreferences?.restriction?.strokeColor || "#F2FF00",
            strokeWidth: loadedPreferences?.restriction?.strokeWidth || 2,
            strokeDashstyle: loadedPreferences?.restriction?.strokeDashstyle || "dash",
        };
        preferences.dirty = {
            strokeColor: loadedPreferences?.dirty?.strokeColor || "#82614A",
            strokeOpacity: loadedPreferences?.dirty?.strokeOpacity || 0.6,
            strokeDashstyle: loadedPreferences?.dirty?.strokeDashstyle || "longdash",
        };

        preferences.speeds = {};
        preferences.speeds.default = loadedPreferences?.speed?.default || "#cc0000";

        if (loadedPreferences?.speeds?.metric) {
            preferences.speeds.metric = loadedPreferences.speeds.metric;
        } else {
            preferences.speeds.metric = {};
            preferences.speeds.metric[5] = loadedPreferences?.speeds?.metric[5] || "#542344";
            preferences.speeds.metric[7] = loadedPreferences?.speeds?.metric[7] || "#ff5714";
            preferences.speeds.metric[10] = loadedPreferences?.speeds?.metric[10] || "#ffbf00";
            preferences.speeds.metric[20] = loadedPreferences?.speeds?.metric[20] || "#ee0000";
            preferences.speeds.metric[30] = loadedPreferences?.speeds?.metric[30] || "#e4ff1a";
            preferences.speeds.metric[40] = loadedPreferences?.speeds?.metric[40] || "#993300";
            preferences.speeds.metric[50] = loadedPreferences?.speeds?.metric[50] || "#33ff33";
            preferences.speeds.metric[60] = loadedPreferences?.speeds?.metric[60] || "#639fab";
            preferences.speeds.metric[70] = loadedPreferences?.speeds?.metric[70] || "#00ffff";
            preferences.speeds.metric[80] = loadedPreferences?.speeds?.metric[80] || "#00bfff";
            preferences.speeds.metric[90] = loadedPreferences?.speeds?.metric[90] || "#0066ff";
            preferences.speeds.metric[100] = loadedPreferences?.speeds?.metric[100] || "#ff00ff";
            preferences.speeds.metric[110] = loadedPreferences?.speeds?.metric[110] || "#ff0080";
            preferences.speeds.metric[120] = loadedPreferences?.speeds?.metric[120] || "#ff0000";
            preferences.speeds.metric[130] = loadedPreferences?.speeds?.metric[130] || "#ff9000";
            preferences.speeds.metric[140] = loadedPreferences?.speeds?.metric[140] || "#ff4000";
            preferences.speeds.metric[150] = loadedPreferences?.speeds?.metric[150] || "#0040ff";
        }

        if (loadedPreferences?.speeds?.imperial) {
            preferences.speeds.imperial = loadedPreferences.speeds.imperial;
        } else {
            preferences.speeds.imperial = {};
            preferences.speeds.imperial[5] = loadedPreferences?.speeds?.imperial[5] || "#ff0000";
            preferences.speeds.imperial[10] = loadedPreferences?.speeds?.imperial[10] || "#ff8000";
            preferences.speeds.imperial[15] = loadedPreferences?.speeds?.imperial[15] || "#ffb000";
            preferences.speeds.imperial[20] = loadedPreferences?.speeds?.imperial[20] || "#bfff00";
            preferences.speeds.imperial[25] = loadedPreferences?.speeds?.imperial[25] || "#993300";
            preferences.speeds.imperial[30] = loadedPreferences?.speeds?.imperial[30] || "#33ff33";
            preferences.speeds.imperial[35] = loadedPreferences?.speeds?.imperial[35] || "#00ff90";
            preferences.speeds.imperial[40] = loadedPreferences?.speeds?.imperial[40] || "#00ffff";
            preferences.speeds.imperial[45] = loadedPreferences?.speeds?.imperial[45] || "#00bfff";
            preferences.speeds.imperial[50] = loadedPreferences?.speeds?.imperial[50] || "#0066ff";
            preferences.speeds.imperial[55] = loadedPreferences?.speeds?.imperial[55] || "#ff00ff";
            preferences.speeds.imperial[60] = loadedPreferences?.speeds?.imperial[60] || "#ff0050";
            preferences.speeds.imperial[65] = loadedPreferences?.speeds?.imperial[65] || "#ff9010";
            preferences.speeds.imperial[70] = loadedPreferences?.speeds?.imperial[70] || "#0040ff";
            preferences.speeds.imperial[75] = loadedPreferences?.speeds?.imperial[75] || "#10ff10";
            preferences.speeds.imperial[80] = loadedPreferences?.speeds?.imperial[80] || "#ff4000";
            preferences.speeds.imperial[85] = loadedPreferences?.speeds?.imperial[85] || "#ff0000";
        }
        //jshint ignore: end
        savePreferences(preferences);
        //Compute properties that need to be computed
        updateComputedValues(preferences);

        return oldUser;
    }

    function getThreshold() {
        if (clutterConstant === clutterMax) {
            return 0;
        }
        return clutterConstant / OLMap.zoom;
    }

    function bestBackground(color) {
        let oppositeColor = parseInt(color.substring(1, 3), 16) * 0.299 + parseInt(color.substring(3, 5), 16) * 0.587 + parseInt(color.substring(5, 7), 16) * 0.114;
        if (oppositeColor < 127) {
            return "#FFF";
        }
        return "#000";
    }

    function getColorStringFromSpeed(speed) {
        if (preferences.showSLSinglecolor) {
            return preferences.SLColor;
        }
        const type = W.prefs.attributes.isImperial ? "imperial" : "metric";
        return preferences.speeds[type][speed] || preferences.speeds.default;
    }

    function getAngle(isForward, p0, p1) {
        let dx, dy, angle;
        dx = 0;
        dy = 0;
        if (isForward) {
            dx = p1.x - p0.x;
            dy = p1.y - p0.y;
        } else {
            dx = p0.x - p1.x;
            dy = p0.y - p1.y;
        }
        angle = Math.atan2(dx, dy);
        return angle * 180 / Math.PI; //360-(...) -90 removed from here
    }

    function getSuperScript(number) {
        let res, i;
        res = "";
        if (number) {
            if (W.prefs.attributes.isImperial) { //Convert the speed limit to mph
                number = Math.round(number / 1.609344);
            }
            number = number.toString();
            for (i = 0; i < number.length; i += 1) {
                res += superScript[number.charAt(i)];
            }
        }
        return res;
    }

    function drawLabels(model, simplified, delayed = false) {
        //consoleDebug("drawLabels");
        let labelFeature, labelText, dx, dy, centroid, directionArrow, streetNameThresholdDistance, p0, p1, doubleLabelDistance, altStreetPart;
        const labels = [];
        labelFeature = null;
        const attributes = model.attributes;
        const address = model.getAddress();
        if (attributes.primaryStreetID !== null && address.attributes.state === undefined) {
            consoleDebug("Address not ready", address, attributes);
            setTimeout(function () {
                drawLabels(model, simplified, true);
            }, 500);
        } else {
            let addressAttributes = address.attributes;
            let streetPart = ((addressAttributes.street !== null && !addressAttributes.street.isEmpty) ? addressAttributes.street.name : (attributes.roadType < 10 && !model.isInRoundabout() ? "⚑" : ""));
            //consoleDebug("Streetpart:" +streetPart);

            // add alt street names
            altStreetPart = "";
            if (preferences.showANs) {
                let ANsShown = 0;
                for (let streetID of attributes.streetIDs) {
                    if (ANsShown === 2) {//Show maximum 2 alternative names
                        altStreetPart += " …";
                        break;
                    }
                    let altStreet = model.model.streets.objects[streetID];
                    if (altStreet && altStreet.name !== addressAttributes.street.name) {
                        ANsShown++;
                        altStreetPart += (altStreet.name ? "(" + altStreet.name + ")" : "");
                    }
                }

                altStreetPart = altStreetPart.replace(")(", ", ");
                if (altStreetPart != "") {
                    altStreetPart = "\n" + altStreetPart;
                }
            }

            if (!streetStyles[attributes.roadType]) {
                streetPart += "\n!! UNSUPPORTED ROAD TYPE !!";
            }
            let speedPart = "";
            let speed = attributes.fwdMaxSpeed || attributes.revMaxSpeed;
            if (speed && preferences.showSLtext) {
                if (attributes.fwdMaxSpeed === attributes.revMaxSpeed) {
                    speedPart = getSuperScript(attributes.fwdMaxSpeed);
                } else {
                    if (attributes.fwdMaxSpeed) {
                        speedPart = getSuperScript(attributes.fwdMaxSpeed);
                        if (attributes.revMaxSpeed) {
                            speedPart += "'" + getSuperScript(attributes.revMaxSpeed);
                        }
                    } else {
                        speedPart = getSuperScript(attributes.revMaxSpeed);
                        if (attributes.fwdMaxSpeed) {
                            speedPart += "'" + getSuperScript(attributes.fwdMaxSpeed);
                        }
                    }
                }
                /*jslint bitwise: true */
                if (attributes.fwdMaxSpeedUnverified | attributes.revMaxSpeedisVerified) {
                    /*jslint bitwise: false */
                    speedPart += "?";
                }
            }
            labelText = streetPart + " " + speedPart;
            if (labelText === " ") {
                return [];
            }
            streetNameThresholdDistance = labelText.length * 2.3 * (8 - OLMap.zoom) + Math.random() * 30;
            doubleLabelDistance = 4 * streetNameThresholdDistance;

            const sampleLabel = new OpenLayers.Feature.Vector(simplified[0], {
                myId: attributes.id,
                color: streetStyles[attributes.roadType] ? streetStyles[attributes.roadType].strokeColor : "#f00",
                outlinecolor: streetStyles[attributes.roadType] ? streetStyles[attributes.roadType].outlineColor : "#fff",
                outlinewidth: preferences.labelOutlineWidth
            });


            const len = simplified.length - 1;
            for (let p = 0; p < len; p += 1) {
                const distance = simplified[p].distanceTo(simplified[p + 1]);
                if (distance >= thresholdDistance) {
                    //consoleDebug("Label can be inserted:");
                    //console.dir(address);
                    dx = 0;
                    dy = 0;
                    if (distance > streetNameThresholdDistance) {
                        //consoleDebug("Label inserted");
                        //p = maxDistanceIndex;
                        if (distance < doubleLabelDistance) { // || farzoom
                            p0 = simplified[p];
                            p1 = simplified[p + 1];
                        } else {
                            p0 = simplified[p];
                            p1 = new OpenLayers.Geometry.LineString([p0, simplified[p + 1]]).getCentroid(true);
                        }
                        centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(true); /*Important pass true parameter otherwise it will return start point as centroid*/
                        //Clone the label
                        labelFeature = sampleLabel.clone();
                        labelFeature.geometry = centroid;
                        if (attributes.fwdDirection) {
                            dx = p1.x - p0.x;
                            dy = p1.y - p0.y;
                        } else {
                            dx = p0.x - p1.x;
                            dy = p0.y - p1.y;
                        }
                        const angle = Math.atan2(dx, dy);
                        let degrees = 90 + angle * 180 / Math.PI;
                        directionArrow = " ▶ ";
                        if (degrees > 90 && degrees < 270) {
                            degrees -= 180;
                            //directionArrow = " ▶ ";
                        } else {
                            directionArrow = " ◀ ";
                        }
                        if (!model.isOneWay()) {
                            directionArrow = ""; //The degree has to be computed anyway
                        }
                        labelFeature.attributes.label = directionArrow + labelText + directionArrow + altStreetPart;

                        labelFeature.attributes.angle = degrees;
                        labelFeature.attributes.closeZoomOnly = p % 2 == 1;
                        labels.push(labelFeature);
                        if (distance >= doubleLabelDistance) { //Create the second label on a long segment //!farZoom &&
                            p0 = p1;
                            p1 = simplified[p + 1];
                            centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(true);
                            labelFeature = labelFeature.clone();
                            labelFeature.geometry = centroid;
                            labelFeature.attributes.closeZoomOnly = true;
                            labels.push(labelFeature);
                        }
                    }
                }
            }
        }
        if (delayed && labelFeature) {
            labelsVector.addFeatures(labels);
        }
        return labels;
    }

    function createAverageSpeedCamera(id, rev, isForward, p0, p1) {
        let degrees;
        degrees = getAngle(isForward, rev ? p1 : p0, rev ? p0 : p1);
        return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(p0.x + Math.sin(degrees) * 10, p0.y + Math.cos(degrees) * 10), {
            myId: id
        }, {
            rotation: degrees,
            externalGraphic: "https://raw.githubusercontent.com/bedo2991/svl/master/average.png",
            graphicWidth: 36,
            graphicHeight: 36,
            graphicZIndex: 300,
            fillOpacity: 1,
            pointerEvents: "none"
        });

    }

    function drawSegment(model) {
        //consoleDebug("DrawSegment");
        let lineFeature, locked, speed,
            speedStrokeStyle, speedValue, simplifiedPoints, arrowFeature, p, len, dx, dy, labels,
            left, right, k, pk, pk1, offset, m, mb, temp,
            step, degrees, segmentLenght, minDistance, segmentLineString,
            numPoints, stepx, stepy, px, py, ix; //dx, dy
        const attributes = model.getAttributes();
        //TODO const hasToBeSk = hasToBeSkipped(attributes.roadType)
        const points = attributes.geometry.components;
        const pointList = attributes.geometry.getVertices(); //is an array
        const simplified = new OpenLayers.Geometry.LineString(pointList).simplify(1.5).components;
        const myFeatures = [];
        const baselevel = attributes.level * 100;
        const isTwoWay = attributes.fwdDirection && attributes.revDirection;
        const isInRoundabout = model.isInRoundabout();
        let isBridge = false;
        let hasSpeedLimit = false;

        const totalSegmentWidth = getWidth({
            segmentWidth: attributes.width,
            roadType: attributes.roadType,
            twoWay: isTwoWay
        });
        let roadWidth = totalSegmentWidth;
        lineFeature = null;
        if (null === attributes.primaryStreetID) {
            //consoleDebug("RED segment", model);
            lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: preferences.red.strokeColor,
                width: totalSegmentWidth,
                dash: preferences.red.strokeDashstyle
            });
            myFeatures.push(lineFeature);
            return myFeatures;
        } else {
            let roadType = attributes.roadType;

            //consoleDebug(width);
            if (preferences.routingModeEnabled && attributes.routingRoadType !== null) {
                roadType = attributes.routingRoadType;
            }

            if (streetStyles[roadType] !== undefined) {

                locked = false;
                speed = attributes.fwdMaxSpeed || attributes.revMaxSpeed; //If it remains null it does not have a speed limit
                //consoleDebug("Road Type: ", roadType);
                if (attributes.level > 0) { //it is a bridge
                    //consoleDebug("Bridge");
                    isBridge = true;
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: "#000000",
                        zIndex: baselevel + 100,
                        width: totalSegmentWidth,
                    });
                    myFeatures.push(lineFeature);
                }

                hasSpeedLimit = speed && preferences.showSLcolor;
                //roadWidth: the width of the "inner" segment, without decorations around it
                if (hasSpeedLimit && isBridge) {
                    //A bridge with speed limit
                    roadWidth = totalSegmentWidth * 0.56;
                } else if (isBridge || hasSpeedLimit) {
                    //A bridge without speed limit or a non-bridge with SL
                    roadWidth = totalSegmentWidth * 0.68;
                }


                if (hasSpeedLimit) { //it has a speed limit
                    //consoleDebug("SpeedLimit");
                    speedStrokeStyle = (preferences.showDashedUnverifiedSL && (attributes.fwdMaxSpeedUnverified || attributes.revMaxSpeedUnverified) ? "dash" : "solid");

                    if (!preferences.showSLSinglecolor && (attributes.fwdMaxSpeed || attributes.revMaxSpeed) && attributes.fwdMaxSpeed !== attributes.revMaxSpeed && !model.isOneWay()) {
                        //consoleDebug("The segment has 2 different speed limits");
                        //It has 2 different speeds:
                        left = [];
                        right = [];
                        for (k = 0, len = pointList.length - 1; k < len; k += 1) {
                            pk = pointList[k];
                            pk1 = pointList[k + 1];
                            dx = pk.x - pk1.x;
                            dy = pk.y - pk1.y;
                            left[0] = pk.clone();
                            right[0] = pk.clone();
                            left[1] = pk1.clone();
                            right[1] = pk1.clone();
                            offset = isBridge ? ((totalSegmentWidth*0.14)) : totalSegmentWidth*0.17;
                            //offset = (totalSegmentWidth / 5.0) * (30.0 / (OLMap.zoom * OLMap.zoom)); //((Wmap.zoom+1)/11)+0.6*(1/(11-Wmap.zoom));// (10-Wmap.zoom/3)/(10-Wmap.zoom);
                            //of2 = 11 * Math.pow(2.0, 5 - W.map.zoom);
                            //console.error(of2);
                            //console.log(offset);
                            if (Math.abs(dx) < 0.5) { //segment is vertical
                                if (dy > 0) {
                                    //console.error("A");
                                    left[0].move(-offset, 0);
                                    left[1].move(-offset, 0);
                                    right[0].move(offset, 0);
                                    right[1].move(offset, 0);
                                } else {
                                    //console.error("B");
                                    left[0].move(offset, 0);
                                    left[1].move(offset, 0);
                                    right[0].move(-offset, 0);
                                    right[1].move(-offset, 0);
                                }
                            } else {
                                m = dy / dx;
                                mb = -1 / m;
                                //consoleDebug("m: ", m);
                                if (Math.abs(m) < 0.05) {
                                    //Segment is horizontal
                                    if (dx > 0) {
                                        //console.error("C");
                                        left[0].move(0, offset);
                                        left[1].move(0, offset);
                                        right[0].move(0, -offset);
                                        right[1].move(0, -offset);
                                    } else {
                                        //console.error("D");
                                        left[0].move(0, -offset);
                                        left[1].move(0, -offset);
                                        right[0].move(0, offset);
                                        right[1].move(0, offset);
                                    }
                                } else {
                                    if ((dy > 0 && dx > 0) || (dx < 0 && dy > 0)) { //1st and 4th q.
                                        offset *= -1;
                                    }
                                    //console.log(offset);
                                    temp = Math.sqrt(1 + (mb * mb));
                                    //console.error("E");
                                    //console.dir(left[0]);
                                    left[0].move(offset / temp, offset * (mb / temp));
                                    //console.dir(left[0]);
                                    left[1].move(offset / temp, offset * (mb / temp));
                                    right[0].move(-offset / temp, -offset * (mb / temp));
                                    right[1].move(-offset / temp, -offset * (mb / temp));
                                }
                            }
                            //consoleDebug("Adding 2 speeds");
                            //consoleDebug(left);
                            //consoleDebug(right);
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(left), {
                                myId: attributes.id,
                                color: getColorStringFromSpeed(attributes.fwdMaxSpeed),
                                width: roadWidth,
                                dash: speedStrokeStyle,
                                closeZoomOnly: true,
                                zIndex: baselevel + 105
                            });
                            myFeatures.push(lineFeature);
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(right), {
                                myId: attributes.id,
                                color: getColorStringFromSpeed(attributes.revMaxSpeed),
                                width: roadWidth,
                                dash: speedStrokeStyle,
                                closeZoomOnly: true,
                                zIndex: baselevel + 110
                            });
                            myFeatures.push(lineFeature);
                        }
                    } else {
                        //The segment is two way street with the same speed limit on both sides or one way street
                        speedValue = attributes.fwdMaxSpeed; //If the segment is two way, take any speed, they are equal.
                        if (model.isOneWay()) {
                            if (attributes.fwdDirection) {
                                speedValue = attributes.fwdMaxSpeed;
                            } else {
                                speedValue = attributes.revMaxSpeed;
                            }
                        }
                        if (speedValue) {
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(pointList), {
                                myId: attributes.id,
                                color: getColorStringFromSpeed(speedValue),
                                width: isBridge ? totalSegmentWidth * 0.80 : totalSegmentWidth,
                                dash: speedStrokeStyle,
                                closeZoomOnly: true,
                                zIndex: baselevel + 115
                            });
                            myFeatures.push(lineFeature);
                        }
                    }
                }

                //Draw the road
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                    myId: attributes.id,
                    color: streetStyles[roadType].strokeColor,
                    width: roadWidth,
                    dash: streetStyles[roadType].strokeDashstyle,
                    zIndex: baselevel + 120
                });
                myFeatures.push(lineFeature);

                if (attributes.level < 0) {
                    //Tunnel
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: "#000000",
                        width: roadWidth,
                        opacity: 0.35,
                        zIndex: baselevel + 125
                        //dash:"solid"
                    });
                    myFeatures.push(lineFeature);
                }

                const currentLock = model.getLockRank() + 1;
                if (currentLock > preferences.fakelock || currentLock > WazeWrap?.User?.Rank()) { // jshint ignore:line
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: nonEditableStyle.strokeColor,
                        width: roadWidth * 0.1,
                        dash: nonEditableStyle.strokeDashstyle,
                        zIndex: baselevel + 147
                    });

                    myFeatures.push(lineFeature);
                    locked = true;
                }

                /*jslint bitwise: true */
                if (attributes.flags & 16) { //The unpaved flag is enabled
                    /*jslint bitwise: false */
                    //Unpaved
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: preferences.dirty.strokeColor,
                        width: roadWidth * 0.7,
                        opacity: preferences.dirty.strokeOpacity,
                        dash: preferences.dirty.strokeDashstyle,
                        zIndex: baselevel + 135
                    });
                    myFeatures.push(lineFeature);
                }

                //Check segment properties


                //CLOSE Zoom properties
                if (attributes.hasClosures) {
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: preferences.closure.strokeColor,
                        width: preferences.closure.strokeWidth,
                        dash: preferences.closure.strokeDashstyle,
                        closeZoomOnly: true,
                        zIndex: baselevel + 140
                    });
                    myFeatures.push(lineFeature);
                }

                if (attributes.fwdToll || attributes.revToll || attributes.restrictions.some(r => r._defaultType === "TOLL")) { //It is a toll road
                    //consoleDebug("Segment is toll");
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: preferences.toll.strokeColor,
                        width: roadWidth * 0.2,//TODO preferences.toll.strokeWidth,
                        dash: preferences.toll.strokeDashstyle,
                        opacity: 0.9,
                        zIndex: baselevel + 145
                    });
                    myFeatures.push(lineFeature);
                }

                if (isInRoundabout) { //It is a roundabout
                    //consoleDebug("Segment is a roundabout");
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: roundaboutStyle.strokeColor,
                        width: roadWidth * 0.15,
                        dash: roundaboutStyle.strokeDashstyle,
                        opacity: roundaboutStyle.strokeOpacity,
                        closeZoomOnly: true,
                        zIndex: baselevel + 150
                    });
                    myFeatures.push(lineFeature);
                }


                if (attributes.restrictions.length > 0) {
                    //It has restrictions
                    //consoleDebug("Segment has restrictions");
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: preferences.restriction.strokeColor,
                        width: roadWidth * 0.3, //preferences.restriction.strokeWidth,
                        dash: preferences.restriction.strokeDashstyle,
                        closeZoomOnly: true,
                        zIndex: baselevel + 155
                    });
                    myFeatures.push(lineFeature);
                }

                if (!locked && attributes.validated === false) { //Segments that needs validation
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: validatedStyle.strokeColor,
                        width: roadWidth*0.5,//validatedStyle.strokeWidth,
                        dash: validatedStyle.strokeDashstyle,
                        closeZoomOnly: true,
                        zIndex: baselevel + 160
                    });
                    myFeatures.push(lineFeature);
                }

                //Headlights
                /*jslint bitwise: true */
                if (attributes.flags & 32) {
                    /*jslint bitwise: false */
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: preferences.headlights.strokeColor,
                        width: roadWidth*0.2,//preferences.headlights.strokeWidth,
                        dash: preferences.headlights.strokeDashstyle,
                        closeZoomOnly: true,
                        zIndex: baselevel + 165
                    });
                    myFeatures.push(lineFeature);
                }

                if (attributes.fwdLaneCount > 0) {
                    //console.log("LANE fwd");
                    let res = pointList.slice(-2);
                    //if(pointList.length === 2){
                    res[0] = new OpenLayers.Geometry.LineString([res[0], res[1]]).getCentroid(true);
                    //}
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(res), {
                        myId: attributes.id,
                        color: preferences.lanes.strokeColor,
                        width: roadWidth*0.3,//preferences.lanes.strokeWidth,
                        dash: preferences.lanes.strokeDashstyle,
                        opacity: 0.9,
                        closeZoomOnly: true,
                        zIndex: baselevel + 170
                    });
                    myFeatures.push(lineFeature);
                }

                if (attributes.revLaneCount > 0) {
                    //console.log("LANE rev");
                    let res = pointList.slice(0, 2);
                    //if(pointList.length === 2){
                    res[1] = new OpenLayers.Geometry.LineString([res[0], res[1]]).getCentroid(true);
                    //}
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(res), {
                        myId: attributes.id,
                        color: preferences.lanes.strokeColor,
                        width: roadWidth*0.3,//preferences.lanes.strokeWidth,
                        dash: preferences.lanes.strokeDashstyle,
                        opacity: 0.9,
                        closeZoomOnly: true,
                        zIndex: baselevel + 175
                    });
                    myFeatures.push(lineFeature);
                }

                if ((attributes.fwdDirection === false || attributes.revDirection === false)) {
                    //consoleDebug("The segment is oneway or has unknown direction");
                    simplifiedPoints = points;
                    if (!isInRoundabout && ((attributes.length / points.length) < preferences.arrowDeclutter)) {
                        simplifiedPoints = simplified;
                    }

                    /*jslint bitwise: true */
                    if ((attributes.fwdDirection | attributes.revDirection) === 0) {
                        /*jslint bitwise: false */
                        //Unknown direction
                        for (p = 0, len = simplifiedPoints.length - 1; p < len; p += 1) {
                            //let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]).getCentroid(true), 2, 6, 0); // origin, size, edges, rotation
                            arrowFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([simplifiedPoints[p], simplifiedPoints[p + 1]]).getCentroid(true), {
                                myId: attributes.id,
                                closeZoomOnly: true,
                                isArrow: true,
                                zIndex: baselevel + 180
                            }, unknownDirStyle);
                            myFeatures.push(arrowFeature);
                        }
                    } else {
                        //Draw normal arrows

                        step = isInRoundabout ? 3 : 1; //It is a roundabout
                        for (p = step - 1, len = simplifiedPoints.length - 1; p < len; p += step) {
                            //it is one way
                            degrees = getAngle(attributes.fwdDirection, simplifiedPoints[p], simplifiedPoints[p + 1]);
                            segmentLenght = simplifiedPoints[p].distanceTo(simplifiedPoints[p + 1]);
                            minDistance = 15.0 * (11 - OLMap.zoom);
                            if (segmentLenght < minDistance * 2) {
                                segmentLineString = new OpenLayers.Geometry.LineString([simplifiedPoints[p], simplifiedPoints[p + 1]]);
                                arrowFeature = new OpenLayers.Feature.Vector(segmentLineString.getCentroid(true), {
                                    myId: attributes.id,
                                    closeZoomOnly: true,
                                    isArrow: true
                                }, {
                                    graphicName: "myTriangle",
                                    rotation: degrees,
                                    stroke: true,
                                    strokeColor: "#000",
                                    graphiczIndex: baselevel + 180,
                                    strokeWidth: 1.5,
                                    fill: true,
                                    fillColor: "#fff",
                                    fillOpacity: 0.7,
                                    pointRadius: 5,
                                });
                                myFeatures.push(arrowFeature);
                            } else {
                                dx = simplifiedPoints[p + 1].x - simplifiedPoints[p].x;
                                dy = simplifiedPoints[p + 1].y - simplifiedPoints[p].y;

                                numPoints = Math.floor(Math.sqrt(dx * dx + dy * dy) / minDistance) - 1;

                                stepx = dx / numPoints;
                                stepy = dy / numPoints;
                                px = simplifiedPoints[p].x + stepx;
                                py = simplifiedPoints[p].y + stepy;
                                for (ix = 0; ix < numPoints; ix += 1) {
                                    arrowFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(px, py), {
                                        myId: attributes.id,
                                        closeZoomOnly: true,
                                        isArrow: true
                                    }, {
                                        graphicName: "myTriangle",
                                        rotation: degrees,
                                        stroke: true,
                                        strokeColor: "#000",
                                        graphiczIndex: baselevel + 180,
                                        strokeWidth: 1.5,
                                        fill: true,
                                        fillColor: "#fff",
                                        fillOpacity: 0.7,
                                        pointRadius: 5,
                                    });
                                    myFeatures.push(arrowFeature);
                                    px += stepx;
                                    py += stepy;
                                }
                            }
                        }
                    }
                }


                /*jslint bitwise: true */
                if (attributes.fwdFlags & 0x1) { //check if speed camera
                    /*jslint bitwise: false */
                    myFeatures.push(createAverageSpeedCamera(attributes.id, false, attributes.fwdDirection, points[0], points[1]));
                }

                /*jslint bitwise: true */
                if (attributes.revFlags & 0x1) { //check if speed camera
                    /*jslint bitwise: false */
                    myFeatures.push(createAverageSpeedCamera(attributes.id, true, attributes.fwdDirection, points[points.length - 1], points[points.length - 2]));
                }

                //Show geometry points
                if (preferences.renderGeomNodes && !isInRoundabout) { //If it's not a roundabout
                    for (p = 1, len = points.length - 2; p < len; p += 1) {
                        //let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(points[p], 2, 6, 0); // origin, size, edges, rotation
                        arrowFeature = new OpenLayers.Feature.Vector(points[p], {
                            myId: attributes.id,
                            closeZoomOnly: true
                        }, geometryNodeStyle);
                        myFeatures.push(arrowFeature);
                    }
                }
                //END: show geometry points
                // End: Close Zoom

                //In any Zoom:

                /*jslint bitwise: true */
                if (attributes.flags & 1) { //The tunnel flag is enabled
                    /*jslint bitwise: false */
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: tunnelFlagStyle1.strokeColor,
                        opacity: tunnelFlagStyle1.strokeOpacity,
                        width: roadWidth * 0.3,
                        dash: tunnelFlagStyle1.strokeDashstyle,
                        zIndex: baselevel + 177
                    });
                    myFeatures.push(lineFeature);
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: tunnelFlagStyle2.strokeColor,
                        width: roadWidth * 0.1,
                        dash: tunnelFlagStyle2.strokeDashstyle,
                        zIndex: baselevel + 177
                    });
                    myFeatures.push(lineFeature);
                } //else: road type is not supported, just add the label            
            }
        }


        //Add Label
        labels = drawLabels(model, simplified);
        if (labels.length > 0) {
            labelsVector.addFeatures(labels);
            //myFeatures = myFeatures.concat(labels);
        }
        return myFeatures;
    }

    function redrawAllSegments() {
        consoleDebug("DrawAllSegments");
        streetVectorLayer.destroyFeatures();
        labelsVector.destroyFeatures();
        addSegments(Object.values(W.model.segments.objects));
        nodesVector.destroyFeatures();
        addNodes(Object.values(W.model.nodes.objects));
    }

    function drawNode(model) {
        let point, pointFeature;
        point = new OpenLayers.Geometry.Point(model.attributes.geometry.x, model.attributes.geometry.y);
        pointFeature = new OpenLayers.Feature.Vector(point, {
            myid: model.attributes.id
        }, getNodeStyle(model.attributes));
        return pointFeature;
    }

    function updateComputedValues(preferences) {
        clutterConstant = preferences.clutterConstant;
        thresholdDistance = getThreshold();
    }

    function updateStylesFromPreferences(preferences) {
        let i, len;
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {
            if (preferences.streets[i]) {
                streetStyles[i] = {
                    strokeColor: preferences.streets[i].strokeColor,
                    strokeWidth: preferences.streets[i].strokeWidth,
                    strokeDashstyle: preferences.streets[i].strokeDashstyle,
                    outlineColor: bestBackground(preferences.streets[i].strokeColor),
                };
            }
        }
        updateComputedValues(preferences);
        redrawAllSegments();
    }

    function rollbackPreferences() {
        loadPreferences();
        updateStylesFromPreferences(preferences);
        updatePreferenceValues();
    }

    function exportPreferences() {
        GM_setClipboard(JSON.stringify(preferences));
        alert("The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
    }

    function importPreferences() {
        let pastedText = prompt("N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:");
        if (pastedText !== null && pastedText !== "") {
            try {
                preferences = JSON.parse(pastedText);
            } catch (ex) {
                alert("Your string seems to be somehow wrong. Place check that is a valid JSON string");
                return;
            }
            updateStylesFromPreferences(preferences);
            savePreferences(preferences);
            updatePreferenceValues();
        }
    }

    function updateLayerPosition() {
        let gps_layer_index;
        gps_layer_index = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);

        if (preferences.showUnderGPSPoints) {
            streetVectorLayer.setZIndex(gps_layer_index - 2);
            nodesVector.setZIndex(gps_layer_index - 1);
        } else {
            streetVectorLayer.setZIndex(gps_layer_index + 1);
            nodesVector.setZIndex(gps_layer_index + 2);
        }
    }

    function updateRoutingModePanel() {
        let routingModeDiv;
        if (preferences.routingModeEnabled) {
            //Show the routing panel
            routingModeDiv = document.createElement('div');
            routingModeDiv.id = "routingModeDiv";
            routingModeDiv.className = "routingDiv";
            routingModeDiv.innerHTML = "Routing Mode<br><small>Hover to temporary disable it<small>";
            routingModeDiv.addEventListener("mouseenter", () => {
                //Temporary disable routing mode
                preferences.routingModeEnabled = false;
                streetVectorLayer.destroyFeatures();
                labelsVector.destroyFeatures();
                nodesVector.destroyFeatures();
                redrawAllSegments();
                //doDraw();
            });
            routingModeDiv.addEventListener("mouseleave", () => {
                //Enable routing mode again
                preferences.routingModeEnabled = true;
                streetVectorLayer.destroyFeatures();
                labelsVector.destroyFeatures();
                nodesVector.destroyFeatures();
                redrawAllSegments();
                //                doDraw();
            });
            document.getElementById("map").appendChild(routingModeDiv);
        } else {
            //Remove the routing panel
            document.getElementById("routingModeDiv")?.remove(); // jshint ignore:line
        }
    }

    function updateRefreshStatus() {
        clearInterval(autoLoadInterval);
        autoLoadInterval = null;
        if (preferences.autoReload && preferences.autoReload.enabled) {
            autoLoadInterval = setInterval(refreshWME, preferences.autoReload.interval);
        }
    }

    function updateValuesFromPreferences() {
        let i, len;
        document.getElementById("svl_saveNewPref").classList.remove("disabled");
        document.getElementById("svl_saveNewPref").classList.add("btn-primary");
        document.getElementById("svl_rollbackButton").classList.remove("disabled");
        document.getElementById("sidepanel-svl").classList.add("svl_unsaved");
        //$("#svl_saveNewPref").removeClass("btn-primary").addClass("btn-warning");
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {
            if (preferences.streets[i]) {
                preferences.streets[i] = {};
                preferences.streets[i].strokeColor = document.getElementById("svl_streetColor_" + i).value;
                preferences.streets[i].strokeWidth = document.getElementById("svl_streetWidth_" + i).value;
                preferences.streets[i].strokeDashstyle = document.querySelector(`#svl_strokeDashstyle_${i} option:checked`).value;
            }
        }

        preferences.fakelock = document.getElementById("svl_fakelock").value;

        const type = W.prefs.attributes.isImperial ? "imperial" : "metric";
        const speeds = Object.keys(preferences.speeds[type]);
        preferences.speeds[type] = {};
        for (let i = 1; i < speeds.length + 1; i++) {
            let value = document.getElementById(`svl_slValue_${type}_${i}`).value;
            preferences.speeds[type][value] = document.getElementById(`svl_slColor_${type}_${i}`).value;
        }

        preferences.speeds.default = document.getElementById(`svl_slColor_${type}_Default`).value;


        //Red
        preferences.red = {};
        preferences.red.strokeColor = document.getElementById("svl_streetColor_red").value;
        preferences.red.strokeWidth = document.getElementById("svl_streetWidth_red").value;
        preferences.red.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_red option:checked").value;

        //Dirty
        preferences.dirty = {};
        preferences.dirty.strokeColor = document.getElementById("svl_streetColor_dirty").value;
        preferences.dirty.strokeOpacity = document.getElementById("svl_streetOpacity_dirty").value / 100.0;
        preferences.dirty.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_dirty option:checked").value;

        //Lanes
        preferences.lanes = {};
        preferences.lanes.strokeColor = document.getElementById("svl_streetColor_lanes").value;
        preferences.lanes.strokeWidth = document.getElementById("svl_streetWidth_lanes").value;
        preferences.lanes.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_lanes option:checked").value;

        //Toll
        preferences.toll = {};
        preferences.toll.strokeColor = document.getElementById("svl_streetColor_toll").value;
        preferences.toll.strokeWidth = document.getElementById("svl_streetWidth_toll").value;
        preferences.toll.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_toll option:checked").value;

        //Restrictions
        preferences.restriction = {};
        preferences.restriction.strokeColor = document.getElementById("svl_streetColor_restriction").value;
        preferences.restriction.strokeWidth = document.getElementById("svl_streetWidth_restriction").value;
        preferences.restriction.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_restriction option:checked").value;

        //Closures
        preferences.closure = {};
        preferences.closure.strokeColor = document.getElementById("svl_streetColor_closure").value;
        preferences.closure.strokeWidth = document.getElementById("svl_streetWidth_closure").value;
        preferences.closure.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_closure option:checked").value;

        //HeadlightsRequired
        preferences.headlights = {};
        preferences.headlights.strokeColor = document.getElementById("svl_streetColor_headlights").value;
        preferences.headlights.strokeWidth = document.getElementById("svl_streetWidth_headlights").value;
        preferences.headlights.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_headlights option:checked").value;

        //AutoReload
        preferences.autoReload = {};
        preferences.autoReload.interval = document.getElementById("svl_autoReload_interval").value * 1000;
        preferences.autoReload.enabled = document.getElementById("svl_autoReload_enabled").checked;

        preferences.clutterConstant = document.getElementById("svl_clutterConstant").value;

        preferences.arrowDeclutter = document.getElementById("svl_arrowDeclutter").value;
        preferences.labelOutlineWidth = document.getElementById("svl_labelOutlineWidth").value;
        preferences.disableRoadLayers = document.getElementById("svl_disableRoadLayers").checked;
        preferences.startDisabled = document.getElementById("svl_startDisabled").checked;

        preferences.showSLtext = document.getElementById("svl_showSLtext").checked;
        preferences.showSLcolor = document.getElementById("svl_showSLcolor").checked;
        preferences.showSLSinglecolor = document.getElementById("svl_showSLSinglecolor").checked;
        preferences.SLColor = document.getElementById("svl_SLColor").value;

        preferences.hideMinorRoads = document.getElementById("svl_hideMinorRoads").checked;
        preferences.showDashedUnverifiedSL = document.getElementById("svl_showDashedUnverifiedSL").checked;
        preferences.farZoomLabelSize = document.getElementById("svl_farZoomLabelSize").value;
        preferences.closeZoomLabelSize = document.getElementById("svl_closeZoomLabelSize").value;

        preferences.renderGeomNodes = document.getElementById("svl_renderGeomNodes").checked;

        //Check if showUnderGPSPoints has been toggled
        if (preferences.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked) {
            //This value has been updated, change the layer positions.
            preferences.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
            updateLayerPosition();
        } else {
            preferences.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
        }

        //Check if routing mode has been toggled
        if (preferences.routingModeEnabled !== document.getElementById("svl_routingModeEnabled").checked) {
            //This value has been updated, change the layer positions.
            preferences.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
            updateRoutingModePanel();
        } else {
            preferences.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
        }

        preferences.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
        preferences.switchZoom = document.getElementById("svl_switchZoom").value;
        preferences.showANs = document.getElementById("svl_showANs").checked;
        preferences.realsize = document.getElementById("svl_realsize").checked;

        if (preferences.realsize) {
            //Disable all width inputs
            $('input.segmentsWidth').prop("disabled", true);
        } else {
            $('input.segmentsWidth').prop("disabled", false);
        }

        updateStylesFromPreferences(preferences);
        updateRefreshStatus();
    }

    function saveNewPref() {
        updateValuesFromPreferences();
        savePreferences(preferences);
        updatePreferenceValues();
    }

    function rollbackDefault(dontask) {
        if (dontask === true || confirm("Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!")) {
            saveDefaultPreferences();
            updateStylesFromPreferences(preferences);
            updatePreferenceValues();
        }
    }

    function createDashStyleDropdown(id) {
        let newSelect = document.createElement("select");
        newSelect.className = "prefElement";
        newSelect.title = "Stroke style";
        newSelect.id = "svl_" + id;
        newSelect.innerHTML = "<option value=\"solid\">Solid</option><option value=\"dash\">Dashed</option><option value=\"dashdot\">Dash Dot</option><option value=\"longdash\">Long Dash</option><option value=\"longdashdot\">Long Dash Dot</option><option value=\"dot\">Dot</option>";
        return newSelect;
    }

    function getLocalisedString(i) {
        const locale = I18n.translations[I18n.locale];
        switch (i) {
            case "red":
                return locale?.segment?.address?.none || i; // jshint ignore:line
            case "toll":
                return locale?.edit?.segment?.fields?.toll_road || i; // jshint ignore:line
            case "restriction":
                return locale?.restrictions?.modal_headers?.restriction_summary || i; // jshint ignore:line
            case "dirty":
                return locale?.edit?.segment?.fields?.unpaved || i; // jshint ignore:line
            case "closure":
                return locale?.objects?.roadClosure?.name || i; // jshint ignore:line
            case "headlights":
                return locale?.edit?.segment?.fields?.headlights || i; // jshint ignore:line
            case "lanes":
                return locale?.objects?.lanes?.title || i; // jshint ignore:line
            case "speed limit":
                return locale?.edit?.segment?.fields?.speed_limit || i; // jshint ignore:line
        }
        return locale?.segment?.road_types[i] || i; // jshint ignore:line

    }

    function createStreetOptionLine(i, showWidth = true, showOpacity = false) {
        const title = document.createElement("h5");
        title.innerText = getLocalisedString(i);

        const color = document.createElement("input");
        color.id = "svl_streetColor_" + i;
        color.className = "prefElement form-control";
        color.style.width = "55pt";
        color.title = "Color";
        color.type = "color";

        const inputs = document.createElement("div");

        if (showWidth) {
            const width = document.createElement("input");
            width.id = "svl_streetWidth_" + i;
            width.className = Number.isInteger(i) ? "form-control prefElement segmentsWidth" : "form-control prefElement";
            width.style.width = "40pt";
            width.title = "Width (in meters)";
            width.type = "number";
            width.min = 1;
            width.max = 20;
            inputs.appendChild(width);
        }

        if (showOpacity) {
            const opacity = document.createElement("input");
            opacity.id = "svl_streetOpacity_" + i;
            opacity.className = "form-control prefElement";
            opacity.style.width = "45pt";
            opacity.title = "Opacity";
            opacity.type = "number";
            opacity.min = 0;
            opacity.max = 100;
            opacity.step = 10;
            inputs.appendChild(opacity);
        }


        const select = createDashStyleDropdown("strokeDashstyle_" + i);
        select.className = "form-control prefElement";


        inputs.className = "expand";
        inputs.appendChild(color);
        inputs.appendChild(select);

        const line = document.createElement("div");
        line.className = "prefLineStreets";
        line.appendChild(title);
        line.appendChild(inputs);

        return line;
    }

    function createSpeedOtionLine(i, metric = true) {
        const type = metric ? "metric" : "imperial";
        //const title = document.createElement("h6");
        //title.innerText = getLocalisedString("speed limit");
        //title.inner
        const label = document.createElement("label");
        label.innerText = i !== -1 ? i : "Default";

        const inputs = document.createElement("div");
        inputs.appendChild(label);

        if (typeof i === "number") {
            const slValue = document.createElement("input");
            slValue.id = `svl_slValue_${type}_${i}`;
            slValue.className = "form-control prefElement";
            slValue.style.width = "50pt";
            slValue.title = "Speed Limit Value";
            slValue.type = "number";
            slValue.min = 0;
            slValue.max = 150;
            inputs.appendChild(slValue);

            const span = document.createElement("span");
            span.innerText = metric? "km/h":"mph";
            inputs.appendChild(span);

        }


        const color = document.createElement("input");
        color.id = `svl_slColor_${type}_${i}`;
        color.className = "prefElement form-control";
        color.style.width = "55pt";
        color.title = "Color";
        color.type = "color";

        inputs.className = "expand";


        inputs.appendChild(color);

        const line = document.createElement("div");
        line.className = "prefLineSL";
        line.appendChild(inputs);

        return line;
    }

    function getOptions() {
        return {
            streets: ["red"],
            decorations: ["lanes", "toll", "restriction", "closure", "headlights", "dirty"]
        };
    }

    /**
     * This function updates the values shown on the preference panel with the one saved in the preferences object.
     *
     */
    function updatePreferenceValues() {
        document.getElementById("svl_saveNewPref").classList.add("disabled");
        document.getElementById("svl_rollbackButton").classList.add("disabled");
        document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
        document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
        for (let i = 0, len = preferences.streets.length; i < len; i++) {

            if (preferences.streets[i]) {
                document.getElementById("svl_streetWidth_" + i).value = preferences.streets[i].strokeWidth;
                document.getElementById("svl_streetColor_" + i).value = preferences.streets[i].strokeColor;
                document.getElementById("svl_strokeDashstyle_" + i).value = preferences.streets[i].strokeDashstyle;
            }
        }

        const options = getOptions();
        for (let o of options.streets) {
            document.getElementById("svl_streetWidth_" + o).value = preferences[o].strokeWidth;
            document.getElementById("svl_streetColor_" + o).value = preferences[o].strokeColor;
            document.getElementById("svl_strokeDashstyle_" + o).value = preferences[o].strokeDashstyle;
        }

        for (let o of options.decorations) {
            if (o === "dirty") {
                document.getElementById("svl_streetOpacity_" + o).value = preferences[o].strokeOpacity * 100.0;
            } else {
                document.getElementById("svl_streetWidth_" + o).value = preferences[o].strokeWidth;
            }
            document.getElementById("svl_streetColor_" + o).value = preferences[o].strokeColor;
            document.getElementById("svl_strokeDashstyle_" + o).value = preferences[o].strokeDashstyle;
        }

        document.getElementById("svl_fakelock").value = WazeWrap && WazeWrap.User ? WazeWrap.User.Rank() : 7;
        document.getElementById("svl_autoReload_enabled").checked = preferences.autoReload.enabled;
        document.getElementById("svl_renderGeomNodes").checked = preferences.renderGeomNodes;
        document.getElementById("svl_labelOutlineWidth").value = preferences.labelOutlineWidth;
        document.getElementById("svl_hideMinorRoads").checked = preferences.hideMinorRoads;
        document.getElementById("svl_autoReload_interval").value = preferences.autoReload.interval / 1000;

        document.getElementById("svl_clutterConstant").value = preferences.clutterConstant;
        document.getElementById("svl_closeZoomLabelSize").value = preferences.closeZoomLabelSize;
        document.getElementById("svl_farZoomLabelSize").value = preferences.farZoomLabelSize;
        document.getElementById("svl_arrowDeclutter").value = preferences.arrowDeclutter;
        document.getElementById("svl_useWMERoadLayerAtZoom").value = preferences.useWMERoadLayerAtZoom;
        document.getElementById("svl_switchZoom").value = preferences.switchZoom;
        document.getElementById("svl_disableRoadLayers").checked = preferences.disableRoadLayers;
        document.getElementById("svl_startDisabled").checked = preferences.startDisabled;
        document.getElementById("svl_showUnderGPSPoints").checked = preferences.showUnderGPSPoints;
        document.getElementById("svl_routingModeEnabled").checked = preferences.routingModeEnabled;
        document.getElementById("svl_showANs").checked = preferences.showANs;
        
        //Speed limits
        document.getElementById("svl_showSLtext").checked = preferences.showSLtext;
        document.getElementById("svl_showSLcolor").checked = preferences.showSLcolor;
        document.getElementById("svl_showSLSinglecolor").checked = preferences.showSLSinglecolor;
        document.getElementById("svl_showDashedUnverifiedSL").checked = preferences.showDashedUnverifiedSL;
        document.getElementById("svl_SLColor").value = preferences.SLColor;
        document.getElementById("svl_realsize").checked = preferences.realsize;

        const segmentWidhts = document.querySelectorAll(".segmentsWidth");
        segmentWidhts.forEach(el => { el.disabled = preferences.realsize; });
        const type = W.prefs.attributes.isImperial ? "imperial" : "metric";
        const speeds = Object.keys(preferences.speeds[type]);
        for (let i = 1; i < speeds.length + 1; i++) {
            document.getElementById(`svl_slValue_${type}_${i}`).value = speeds[i - 1];
            document.getElementById(`svl_slColor_${type}_${i}`).value = preferences.speeds[type][speeds[i - 1]];
        }

        document.getElementById(`svl_slColor_${type}_Default`).value = preferences.speeds.default;

    }

    function createCheckboxOption({ id, title, description }) {
        const line = document.createElement("div");
        line.className = "prefLineCheckbox";
        const label = document.createElement("label");
        label.innerText = title;

        const input = document.createElement("input");
        input.className = "prefElement";
        input.title = "True or False";
        input.id = "svl_" + id;
        input.type = "checkbox";
        input.checked = preferences[id];

        label.appendChild(input);
        line.appendChild(label);

        const i = document.createElement("i");
        i.innerText = description;
        line.appendChild(i);

        return line;
    }

    function createIntegerOption({ id, title, description, min, max, step }) {
        const line = document.createElement("div");
        line.className = "prefLineInteger";
        const label = document.createElement("label");
        label.innerText = title;

        const input = document.createElement("input");
        input.className = "prefElement form-control";
        input.title = "Insert a number";
        input.id = "svl_" + id;
        input.type = "number";

        input.min = min;
        input.max = max;
        input.step = step;

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement("i");
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    function createRangeOption({ id, title, description, min, max, step }) {
        const line = document.createElement("div");
        line.className = "prefLineSlider";
        const label = document.createElement("label");
        label.innerText = title;

        const input = document.createElement("input");
        input.className = "prefElement form-control";
        input.title = "Pick a value using the slider";
        input.id = "svl_" + id;
        input.type = "range";

        input.min = min;
        input.max = max;
        input.step = step;

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement("i");
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    function createPreferencesSection(name, open = false){
        const details = document.createElement("details");
        details.open = open;
        const summary = document.createElement("summary");
        summary.innerText = name;
        details.appendChild(summary);
        return details;
    }

    function initPreferencePanel() {
        const style = document.createElement("style");
        style.innerHTML = `
        <style>
        #sidepanel-svl details{margin-bottom:9pt;}
        .svl_unsaved{background-color:#ffcc00}
        .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}
        .prefLineCheckbox{width:100%; margin-bottom:1vh;}
        .prefLineCheckbox label{display:block;width:100%}
        .prefLineCheckbox input{float:right;}
        .prefLineInteger{width:100%; margin-bottom:1vh;}
        .prefLineInteger label{display:block;width:100%}
        .prefLineInteger input{float:right;}
        .prefLineSlider {width:100%; margin-bottom:1vh;}
        .prefLineSlider label{display:block;width:100%}
        .prefLineSlider input{float:right;}
        .svl_logo {width:130px; display:inline-block; float:right}
        #sidepanel-svl h5{text-transform: capitalize;}
        .svl_support-link{display:inline-block; width:100%; text-align:center;}
        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:#eee; top:0; }
        .routingDiv{opacity: 0.95; font-size:1.2em; border:0.2em #000 solid; position:absolute; top:3em; right:2em; padding:0.5em; background-color:#b30000}
        #sidepanel-svl summary{font-weight:bold; margin:10px;}</style>`;


        document.body.appendChild(style);
        const mainDiv = document.createElement("div");

        const logo = document.createElement("img");
        logo.className="svl_logo";
        logo.src = "https://raw.githubusercontent.com/bedo2991/svl/master/logo.png";
        logo.alt = "Street Vector Layer Logo";
        mainDiv.appendChild(logo);

        const spanThanks = document.createElement("span");
        spanThanks.innerText = "Thanks for using";
        mainDiv.appendChild(spanThanks);

        const svlTitle = document.createElement("h4");
        svlTitle.innerText = "Street Vector Layer";
        mainDiv.appendChild(svlTitle);

        const spanVersion = document.createElement("span");
        spanVersion.innerText = "Version " + GM_info.script.version;
        mainDiv.appendChild(spanVersion);

        const supportForum = document.createElement("a");
        supportForum.innerText = "Something not working? Report it here.";
        supportForum.href=GM_info.script.supportURL;
        supportForum.target="_blank";
        supportForum.className="svl_support-link";
        mainDiv.appendChild(supportForum);

        //mainDiv.id = "svl_PrefDiv";

        const saveButton = document.createElement("button");
        saveButton.id = "svl_saveNewPref";
        saveButton.type = "button";
        saveButton.className = "btn disabled waze-icon-save";
        saveButton.innerText = "Save";
        saveButton.title = "Save your edited settings";


        const rollbackButton = document.createElement("button");
        rollbackButton.id = "svl_rollbackButton";
        rollbackButton.type = "button";
        rollbackButton.className = "btn btn-default disabled";
        rollbackButton.innerText = "Rollback";
        rollbackButton.title = "Discard your temporary changes";


        const resetButton = document.createElement("button");
        resetButton.id = "svl_resetButton";
        resetButton.type = "button";
        resetButton.className = "btn btn-default";
        resetButton.innerText = "Reset";
        resetButton.title = "Overwrite your current settings with the default ones";

        const buttons = document.createElement("div");
        buttons.className="svl_buttons expand";
        buttons.appendChild(saveButton);
        buttons.appendChild(rollbackButton);
        buttons.appendChild(resetButton);

        mainDiv.appendChild(buttons);

        const streets = createPreferencesSection("Roads Properties", true);

        streets.appendChild(createCheckboxOption({
            id: "realsize",
            title: "Use real-life Width",
            description: "When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences."
        }));

        for (let i = 0, len = preferences.streets.length; i < len; i++) {
            if (preferences.streets[i]) {
                streets.appendChild(createStreetOptionLine(i));
            }
        }

        const decorations = createPreferencesSection("Segments Decorations");

        const labels = createPreferencesSection("Rendering Parameters");

        const speedLimits = createPreferencesSection("Speed Limits");

        const options = getOptions();
        for (let o of options.streets) {
            streets.appendChild(createStreetOptionLine(o));
        }

        for (let o of options.decorations) {
            if (o !== "dirty") {
                if(o === "red"){
                    decorations.appendChild(createStreetOptionLine(o, false));
                }else{
                    decorations.appendChild(createStreetOptionLine(o));
                }
            } else {
                decorations.appendChild(createStreetOptionLine(o, false, true));
            }
        }

        streets.appendChild(decorations);
        mainDiv.appendChild(streets);


        streets.appendChild(createCheckboxOption({
            id: "showANs",
            title: "Show Alternative Names",
            description: "When enabled, at most 2 ANs that differ from the primary name are shown under the street name."
        }));

        labels.appendChild(createCheckboxOption({
            id: "routingModeEnabled",
            title: "Enable Routing Mode",
            description: "When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway."
        }));

        labels.appendChild(createCheckboxOption({
            id: "showUnderGPSPoints",
            title: "GPS Layer above Roads",
            description: "When enabled, the GPS layer gets shown above the road layer."
        }));

        streets.appendChild(createRangeOption({
            id: "labelOutlineWidth",
            title: "Labels Outline Width",
            description: "How much border should the labels have?",
            min: 0,
            max: 10,
            step: 1
        }));

        labels.appendChild(createCheckboxOption({
            id: "disableRoadLayers",
            title: "Hide WME Road Layer",
            description: "When enabled, the WME standard road layer gets hidden automatically."
        }));

        labels.appendChild(createCheckboxOption({
            id: "startDisabled",
            title: "SVL Initially Disabled",
            description: "When enabled, the SVL does not get enabled automatically."
        }));

        streets.appendChild(createRangeOption({
            id: "clutterConstant",
            title: "Street Names Density",
            description: "For an higher value, less elements will be shown.",
            min: 10, max: clutterMax, step: 1
        }));

        labels.appendChild(createIntegerOption({
            id: "useWMERoadLayerAtZoom",
            title: "Stop using SVL at zoom level",
            description: "When you reach this zoom level, the road layer gets automatically enabled.",
            min: 0, max: 5, step: 1
        }));

        labels.appendChild(createIntegerOption({
            id: "switchZoom",
            title: "Close-zoom until level",
            description: "When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)",
            min: 5, max: 9, step: 1
        }));

        const closeZoomTitle = document.createElement("h5");
        closeZoomTitle.innerText = "Close-zoom only";

        labels.appendChild(closeZoomTitle);

        labels.appendChild(createCheckboxOption({
            id: "renderGeomNodes",
            title: "Render Geometry Nodes",
            description: "When enabled, the geometry nodes are drawn, too."
        }));

        labels.appendChild(createIntegerOption({
            id: "fakelock",
            title: "Render Map as Level",
            description: "All segments locked above this level will be stroked through with a black line.",
            min: 1, max: 7, step: 1
        }));

        labels.appendChild(createRangeOption({
            id: "closeZoomLabelSize",
            title: "Font Size (at close zoom)",
            description: "Increase this value if you can't read the street names because they are too small.",
            min: 8, max: fontSizeMax, step: 1
        }));

        labels.appendChild(createRangeOption({
            id: "arrowDeclutter",
            title: "Limit Arrows",
            description: "Increase this value if you want less arrows to be shown on streets (it increases the performance).",
            min: 1, max: 200, step: 1
        }));



        const farZoomTitle = document.createElement("h5");
        farZoomTitle.innerText = "Far-zoom only";
        labels.appendChild(farZoomTitle);

        labels.appendChild(createRangeOption({
            id: "farZoomLabelSize",
            title: "Font Size (at far zoom)",
            description: "Increase this value if you can't read the street names because they are too small.",
            min: 8, max: fontSizeMax
        }));

        labels.appendChild(createCheckboxOption({
            id: "hideMinorRoads",
            title: "Hide minor roads at zoom 3",
            description: "The WME loads some type of roads when they probably shouldn't be, check this option for avoid displaying them at higher zooms."
        }));


        mainDiv.appendChild(labels);

        const utilities = createPreferencesSection("Utilities");

        utilities.appendChild(createCheckboxOption({
            id: "autoReload_enabled",
            title: "Automatically Refresh the Map",
            description: "When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing."
        }));

        utilities.appendChild(createIntegerOption({
            id: "autoReload_interval",
            title: "Auto Reload Time Interval (in Seconds)",
            description: "How often should the WME be refreshed for new edits?",
            min: 20, max: 3600, step: 1
        }));
        mainDiv.appendChild(utilities);

        speedLimits.appendChild(createCheckboxOption({
            id: "showSLtext",
            title: "Show on the Street Name",
            description: "Show the speed limit as text at the end of the street name."
        }));

        speedLimits.appendChild(createCheckboxOption({
            id: "showSLcolor",
            title: "Show using colors",
            description: "Show the speed limit by coloring the segment's outline."
        }));

        /*
        for (let k = W.prefs.attributes.isImperial ? 9 : 15; k > 1; k -= 1) {
            const span = document.createElement("span");
            if (W.prefs.attributes.isImperial) {
                span.style.color = getColorStringFromSpeed((k * 10 - 5) * 1.609344);
                span.innerText = k * 10 - 5;
            } else {
                span.style.color = getColorStringFromSpeed(k * 10);
                span.innerText = k * 10;
            }
            span.style.marginRight = "1pt";
            speedLimits.appendChild(span);
        }*/

        speedLimits.appendChild(createCheckboxOption({
            id: "showSLSinglecolor",
            title: "Show using Single Color",
            description: "Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value."
        }));

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.className = "prefElement form-control";
        colorPicker.id = "svl_SLColor";
        speedLimits.appendChild(colorPicker);

        speedLimits.appendChild(createCheckboxOption({
            id: "showDashedUnverifiedSL",
            title: "Show unverified Speed Limits with a dashed Line",
            description: "If the speed limit is not verified, it will be shown with a different style."
        }));

        const slTitle = document.createElement("h6");
        slTitle.innerText = getLocalisedString("speed limit");
        speedLimits.appendChild(slTitle);
        const type = W.prefs.attributes.isImperial ? "imperial" : "metric";
        speedLimits.appendChild(createSpeedOtionLine("Default"));
        for (let i = 1; i < Object.keys(preferences.speeds[type]).length + 1; i++) {
            speedLimits.appendChild(createSpeedOtionLine(i, !W.prefs.attributes.isImperial));
        }

        mainDiv.appendChild(speedLimits);

        const subTitle = document.createElement("h5");
        subTitle.innerText = "Settings Backup";
        mainDiv.appendChild(subTitle);

        const utilityButtons = document.createElement("div");
        utilityButtons.className = "expand";

        const exportButton = document.createElement("button");
        exportButton.id = "svl_exportButton";
        exportButton.type = "button";
        exportButton.innerText = "Export";
        exportButton.className = "btn btn-default";

        const importButton = document.createElement("button");
        importButton.id = "svl_importButton";
        importButton.type = "button";
        importButton.innerText = "Import";
        importButton.className = "btn btn-default";

        utilityButtons.appendChild(importButton);
        utilityButtons.appendChild(exportButton);
        mainDiv.appendChild(utilityButtons);


        new WazeWrap.Interface.Tab('SVL 🗺️', mainDiv.innerHTML, updatePreferenceValues);

        const prefElements = document.querySelectorAll(".prefElement");
        prefElements.forEach(element => {
            element.addEventListener('change', updateValuesFromPreferences);
        });

        document.getElementById("svl_saveNewPref").addEventListener("click", saveNewPref);
        document.getElementById("svl_rollbackButton").addEventListener("click", rollbackPreferences);
        document.getElementById("svl_resetButton").addEventListener("click", rollbackDefault);
        document.getElementById("svl_importButton").addEventListener("click", importPreferences);
        document.getElementById("svl_exportButton").addEventListener("click", exportPreferences);
    }

    function removeNodeById(id) {
        nodesVector.destroyFeatures(nodesVector.getFeaturesByAttribute("myid", id));
    }

    function removeNodes(e) {
        //console.debug("Remove nodes");
        let i;
        for (i = 0; i < e.length; i += 1) {
            removeNodeById(e[i].attributes.id);
        }
        return true;
    }

    function getNodeStyle(attributes) {
        if (attributes.segIDs?.length === 1) //jshint ignore:line
        {
            return nodeStyleDeadEnd;
        }
        return nodeStyle;
    }

    function changeNodes(e) {
        consoleDebug("Change nodes");
        for (let node of e) {
            let attr = node.attributes;
            let nodeFeature = nodesVector.getFeaturesByAttribute("myid", attr.id)[0];
            if (nodeFeature) {
                nodeFeature.style = getNodeStyle(attr);
                nodeFeature.move(new OpenLayers.LonLat(attr.geometry.x, attr.geometry.y));
            } else if (attr.id > 0) {
                //The node has just been saved
                nodesVector.addFeatures(Array.of(drawNode(node)));
            }//Else it is a temporary node, we won't draw it.
        }
    }

    function nodeStateDeleted(e) {
        consoleDebug("Node state deleted");
        for (let i = 0; i < e.length; i++) {
            let n = e[i].attributes;
            removeNodeById(n.id);
        }
    }

    function segmentsStateDeleted(e) {
        for (let i = 0; i < e.length; i++) {
            let s = e[i].attributes;
            removeSegmentById(s.id);
        }
    }

    function addNodes(e) {
        consoleDebug("Add Nodes");
        let myFeatures, i;
        myFeatures = [];
        for (i = 0; i < e.length; i += 1) {
            if (e[i].attributes.geometry !== undefined) {
                if (e[i].attributes.id > 0) {
                    myFeatures.push(drawNode(e[i]));
                }
            }
        }

        nodesVector.addFeatures(myFeatures);
        return true;
    }

    function removeSVLEvents(event) { //Keep all the events that don't have the svl flag enabled.
        return !event.svl;
    }

    function updateStatusBasedOnZoom() {
        consoleDebug("updateStatusBasedOnZoom running");
        if (OLMap.zoom <= preferences.useWMERoadLayerAtZoom) { //There is nothing to draw, enable road layer
            consoleDebug("Road layer automatically enabled because of zoom out");
            //consoleDebug("Vector visibility: ", streetVector.visibility);
            if (streetVectorLayer.visibility === true) {
                SVLAutomDisabled = true;
                setLayerVisibility(ROAD_LAYER, true);
                setLayerVisibility(SVL_LAYER, false);
            }
            return false;
        } else if (SVLAutomDisabled) {
            //Reenable the SVL
            consoleDebug("Re-enabling SVL after zoom in");
            setLayerVisibility(SVL_LAYER, true);
            setLayerVisibility(ROAD_LAYER, false);
            SVLAutomDisabled = false;
            return true;
        }
    }

    let timer = null;
    function manageZoom() {
        //Event deferring
        clearTimeout(timer);
        consoleDebug("manageZoom clearing timer");
        timer = setTimeout(updateStatusBasedOnZoom, 600);
    }

    function registerSegmentsEvents() {
        //console.debug("SVL: Registering segment events");
        const events = W.model.segments._events;
        events.objectsadded.push({
            context: streetVectorLayer,
            callback: addSegments,
            svl: true
        });
        events.objectschanged.push({
            context: streetVectorLayer,
            callback: editSegments,
            svl: true
        });
        events.objectsremoved.push({
            context: streetVectorLayer,
            callback: removeSegments,
            svl: true
        });
        events['objects-state-deleted'].push({
            context: streetVectorLayer,
            callback: segmentsStateDeleted,
            svl: true
        });
    }

    function removeSegmentsEvents() {
        consoleDebug("SVL: Removing segments events");
        const events = W.model.segments._events;
        events.objectsadded = events.objectsadded.filter(removeSVLEvents);
        events.objectschanged = events.objectschanged.filter(removeSVLEvents);
        events.objectsremoved = events.objectsremoved.filter(removeSVLEvents);
        events['objects-state-deleted'] = events['objects-state-deleted'].filter(removeSVLEvents);
    }

    function removeNodeEvents() {
        consoleDebug("SVL: Removing node events");
        const events = W.model.nodes._events;
        events.objectsremoved = events.objectsremoved.filter(removeSVLEvents);
        events.objectsadded = events.objectsadded.filter(removeSVLEvents);
        events.objectschanged = events.objectschanged.filter(removeSVLEvents);
        events["objects-state-deleted"] = events["objects-state-deleted"].filter(removeSVLEvents);
    }

    function registerNodeEvents() {
        consoleDebug("SVL: Registering node events");
        const events = W.model.nodes._events;
        events.objectsremoved.push({
            context: nodesVector,
            callback: removeNodes,
            svl: true
        });
        events.objectsadded.push({
            context: nodesVector,
            callback: addNodes,
            svl: true
        });
        events.objectschanged.push({
            context: nodesVector,
            callback: changeNodes,
            svl: true
        });
        events["objects-state-deleted"].push({
            context: nodesVector,
            callback: nodeStateDeleted,
            svl: true
        });
    }

    /**
     * Draws the given array of segments
     *
     * @param {[]} segments
     */
    function addSegments(segments) {
        consoleDebug("Add Segments");
        let myFeatures = [];
        //console.log("Size: " + e.length);
        for (let el of segments) {
            if (el !== null) {
                myFeatures = myFeatures.concat(drawSegment(el));
                //myFeatures.push(...features);
            }
        }
        if (myFeatures.length > 0) {
            streetVectorLayer.addFeatures(myFeatures);
        }
    }

    function removeSegmentById(id) {
        consoleDebug("RemoveSegmentById", id, typeof (id));
        streetVectorLayer.destroyFeatures(streetVectorLayer.getFeaturesByAttribute("myId", id));
        labelsVector.destroyFeatures(labelsVector.getFeaturesByAttribute("myId", id));
    }

    function editSegments(e) {
        //console.debug("Changed Segment");
        let i;
        //consoleDebug("Segments modifed", e);
        for (i = 0; i < e.length; i += 1) {
            if (e[i]._prevID !== undefined) {
                removeSegmentById(parseInt(e[i]._prevID, 10));
            }
            removeSegmentById(e[i].attributes.id);
            //console.debug(e[i]);
            if (e[i].state !== "Delete") {
                addSegments([e[i]]);
            }
        }
    }

    function removeSegments(e) {
        let i;
        //consoleDebug("Segments removed from model");
        for (i = 0; i < e.length; i += 1) {
            removeSegmentById(e[i].attributes.id);
        }
    }

    function manageVisibilityChanged(e) {
        //Toggle node layer visibility accordingly
        //consoleDebug("Manage nodes", e);
        nodesVector.setVisibility(e.object.visibility);
        labelsVector.setVisibility(e.object.visibility);
        if (e.object.visibility) {
            //SVL was just enabled
            consoleDebug("enabled: registering events");
            registerSegmentsEvents();
            registerNodeEvents();
            let res = updateStatusBasedOnZoom();
            if (res === false) {
                //alert("Please Zoom-in to enable the Street Vector Layer");
            } else {
                redrawAllSegments();
            }
        } else {
            //SVL was disabled
            consoleDebug("disabled: unregistering events");
            removeSegmentsEvents();
            removeNodeEvents();

            nodesVector.destroyFeatures();
            labelsVector.destroyFeatures();
            streetVectorLayer.destroyFeatures();
        }
    }

    function initWazeWrap(trial = 1) {
        if (trial > 30) {
            console.error("SVL: could not initialize WazeWrap");
            return;
        }

        if (!WazeWrap || !WazeWrap.Ready || WazeWrap.Interface === undefined) {
            console.log("SVL: WazeWrap not ready, retrying in 800ms");
            setTimeout(() => { initWazeWrap(++trial); }, 800);
            return;
        }
        initWazeWrapElements();
    }

    function initWazeWrapElements() {
        console.log("SVL: initializing WazeWrap");
        //Adding keyboard shortcut
        try {
            new WazeWrap.Interface.Shortcut('SVLToggleLayer', 'Toggle SVL', 'svl', 'Street Vector Layer', "A+l", function () {
                setLayerVisibility(SVL_LAYER, !streetVectorLayer.visibility);
            }, null).add();
            console.log("SVL: Keyboard shortcut successfully added.");
        }
        catch (e) {
            console.error("SVL: Error while adding the keyboard shortcut:");
            console.error(e);
        }

        //Add the layer checkbox
        try {
            WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", true, (checked) => { streetVectorLayer.setVisibility(checked); }, streetVectorLayer);
        } catch (e) {
            console.error("SVL: could not add layer checkbox");
        }
        if (preferences.startDisabled) {
            setLayerVisibility(SVL_LAYER, false);
        }
        initPreferencePanel();
        WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", GM_info.script.version,
            `<b>Major update!</b>
            <br>Many things have changed! You may need to change some settings to have a similar view as before (for example increasing the streets width)
        <br>- NEW: Rendering completely rewritten: performance improvements
        <br>- NEW: The preference panel was redesigned and is now in the sidebar (SVL 🗺️)
        <br>- NEW: You can set what color to use for each speed limit (User request)
        <br>- NEW: Added an option to render the streets based on their width (one way streets are thinner, their size changes when you zoom)
        <br>- NEW: Some options are now are now localised using WME's strings
        <br>- NEW: Dead-end nodes are rendered with a different color
        <br>- NEW: The Preference panel changes color when you have unsaved changes
        <br>- Removed: the zoom-level indicator while editing the preferences
        <br>- Bug fixes and new bugs :)`);
    }


    function initSVL(svlAttempts = 0) {
        //Initialize variables
        let labelStyleMap, layerName, layers;
        try {
            svlWazeBits();
        } catch (e) {
            svlAttempts += 1;
            if (svlAttempts < 20) {
                console.warn(e);
                console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
                setTimeout(() => { initSVL(++svlAttempts); }, 500);
                return;
            } /*else {*/
            console.error(e);
            alert("Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.");
            return;
        }

        svlGlobals();

        if (loadPreferences() === false) {
            //First run, or new broswer
            alert("This is the first time that you run Street Vector Layer in this browser.\n" +
                "Some info about it:\n" +
                "By default, use ALT+L to toggle the layer.\n" +
                "You can change the streets color, thickness and style using the panel on the left sidebar.\n" +
                "Your preferences will be saved for the next time in your browser.\n" +
                "The other road layers will be automatically hidden (you can change this behaviour in the preference panel).\n" +
                "Have fun and tell us on the Waze forum if you liked the script!");
        }


        const roadStyleMap = new OpenLayers.StyleMap({
            pointerEvents: "none",
            strokeColor: "${color}",
            strokeWidth: "${width}",
            strokeOpacity: "${opacity}",
            strokeDashstyle: "${dash}",
            graphicZIndex: "${zIndex}"
        });

        labelStyleMap = new OpenLayers.StyleMap({
            fontFamily: "Rubik, Open Sans, Alef, helvetica, sans-serif",
            fontWeight: "800",
            fontColor: "${color}",
            labelOutlineColor: "${outlinecolor}",
            labelOutlineWidth: "${outlinewidth}",
            label: "${label}",
            visibility: preferences.startDisabled || true,
            angle: "${angle}",
            pointerEvents: "none",
            labelAlign: "cm" //set to center middle
        });
        layerName = "Street Vector Layer";

        streetVectorLayer = new OpenLayers.Layer.Vector(layerName, {
            styleMap: roadStyleMap,
            uniqueName: "vectorStreet",
            accelerator: "toggle" + layerName.replace(/\s+/g, ''),
            visibility: preferences.startDisabled || true,
            isVector: true,
            attribution: "SVL v. " + GM_info.script.version,
            rendererOptions: {
                zIndexing: true
            }
        });

        streetVectorLayer.renderer.drawFeature =
            function (feature, style) {
                if (style == null) {
                    style = feature.style;
                }

                if (feature.geometry) {
                    //if (bounds) {
                    const farZoom = isFarZoom();
                    if (OLMap.zoom < 2 || (feature.attributes.closeZoomOnly && farZoom) || (feature.attributes.farZoomOnly && !farZoom)) {
                        style = { display: "none" };
                    }
                    else {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(this.extent)) {
                            style = { display: "none" };
                        } else {
                            this.featureDx = 0;

                            style.pointerEvents = "none";
                            if (!farZoom) {
                                if (!feature.attributes.isArrow && preferences.realsize) {
                                    style.strokeWidth = style.strokeWidth / OLMap.resolution;
                                }
                            }
                        }
                    }

                    return this.drawGeometry(feature.geometry, style, feature.id);
                    //} else { alert("No bounds!"); }
                }
            };


        nodesVector = new OpenLayers.Layer.Vector("Nodes Vector", {
            uniqueName: "vectorNodes",
            visibility: preferences.startDisabled || true
        });

        nodesVector.renderer.drawFeature =
            function (feature, style) {
                if (OLMap.zoom < 2) {
                    style = { display: "none" };
                    return this.drawGeometry(feature.geometry, style, feature.id);
                }
                if (style == null) {
                    style = feature.style;
                }

                style = OpenLayers.Util.extend({}, style);


                if (feature.geometry) {

                    //if (bounds) {
                    const farZoom = isFarZoom();
                    if (!farZoom) {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(this.extent)) {
                            style = { display: "none" };
                        } else {
                            this.featureDx = 0;
                            if (preferences.realsize) {
                                style.pointRadius = style.pointRadius / OLMap.resolution;
                            }
                        }
                    } else {
                        style = { display: "none" };
                    }
                    return this.drawGeometry(feature.geometry, style, feature.id);

                    //} else { alert("No bounds!"); }
                }
            };

        labelsVector = new OpenLayers.Layer.Vector("Labels Vector", {
            uniqueName: "vectorLabels",
            styleMap: labelStyleMap,
            visibility: true,
        });

        labelsVector.renderer.drawFeature =
            function (feature, style) {
                if (OLMap.zoom < 2) {
                    return false;
                }
                if (style == null) {
                    style = feature.style;
                }


                if (feature.geometry) {
                    //if (bounds) {
                    const farZoom = isFarZoom();
                    if ((feature.attributes.closeZoomOnly && farZoom) || (feature.attributes.farZoomOnly && !farZoom)) {
                        style = { display: "none" };
                    }
                    else {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(this.extent)) {
                            style = { display: "none" };
                        } else {
                            this.featureDx = 0;
                            style.pointerEvents = "none";
                            style.fontSize = farZoom ? preferences.farZoomLabelSize : preferences.closeZoomLabelSize;
                        }
                    }

                    var rendered = this.drawGeometry(feature.geometry, style, feature.id);
                    if (style.display != "none" && style.label && rendered !== false) {

                        var location = feature.geometry.getCentroid();
                        if (style.labelXOffset || style.labelYOffset) {
                            var xOffset = isNaN(style.labelXOffset) ? 0 : style.labelXOffset;
                            var yOffset = isNaN(style.labelYOffset) ? 0 : style.labelYOffset;
                            var res = this.getResolution();
                            location.move(xOffset * res, yOffset * res);
                        }
                        this.drawText(feature.id, style, location);
                    } else {
                        this.removeText(feature.id);
                    }
                    return rendered;
                    //} else { alert("No bounds!"); }
                }
            };


        labelsVector.renderer.drawText = function (featureId, style, location) {
            const drawOutline = (!!style.labelOutlineWidth);
            // First draw text in halo color and size and overlay the
            // normal text afterwards
            if (drawOutline) {
                const outlineStyle = OpenLayers.Util.extend({}, style);
                outlineStyle.fontColor = outlineStyle.labelOutlineColor;
                outlineStyle.fontStrokeColor = outlineStyle.labelOutlineColor;
                outlineStyle.fontStrokeWidth = style.labelOutlineWidth;
                if (style.labelOutlineOpacity) {
                    outlineStyle.fontOpacity = style.labelOutlineOpacity;
                }
                delete outlineStyle.labelOutlineWidth;
                this.drawText(featureId, outlineStyle, location);
            }

            const resolution = this.getResolution();

            const x = ((location.x - this.featureDx) / resolution + this.left);
            const y = (location.y / resolution - this.top);

            const suffix = (drawOutline) ? this.LABEL_OUTLINE_SUFFIX : this.LABEL_ID_SUFFIX;
            const label = this.nodeFactory(featureId + suffix, "text");

            label.setAttributeNS(null, "x", x);
            label.setAttributeNS(null, "y", -y);

            if (style.angle || style.angle === 0) {
                const rotate = `rotate(${style.angle},${x},${-y})`;
                label.setAttributeNS(null, "transform", rotate);
            }
            if (style.fontFamily) {
                label.setAttributeNS(null, "font-family", style.fontFamily);
            }
            if (style.fontWeight) {
                label.setAttributeNS(null, "font-weight", style.fontWeight);
            }

            if (style.fontSize) {
                label.setAttributeNS(null, "font-size", style.fontSize);
            }

            if (style.fontColor) {
                label.setAttributeNS(null, "fill", style.fontColor);
            }
            if (style.fontStrokeColor) {
                label.setAttributeNS(null, "stroke", style.fontStrokeColor);
            }

            if (style.fontStrokeWidth) {
                label.setAttributeNS(null, "stroke-width", style.fontStrokeWidth);
            }

            /*
            if (style.fontOpacity) {
                label.setAttributeNS(null, "opacity", style.fontOpacity);
            }

            if (style.fontStyle) {
                label.setAttributeNS(null, "font-style", style.fontStyle);
            }
            if (style.labelSelect === true) {
                label.setAttributeNS(null, "pointer-events", "visible");
                label._featureId = featureId;
            } else {
                label.setAttributeNS(null, "pointer-events", "none");
            }
            */
            label.setAttributeNS(null, "pointer-events", "none");

            const align = style.labelAlign || OpenLayers.Renderer.defaultSymbolizer.labelAlign;
            label.setAttributeNS(null, "text-anchor",
                OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] || "middle");

            if (OpenLayers.IS_GECKO === true) {
                label.setAttributeNS(null, "dominant-baseline",
                    OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] || "central");
            }

            const labelRows = style.label.split('\n');
            const numRows = labelRows.length;
            while (label.childNodes.length > numRows) {
                label.removeChild(label.lastChild);
            }
            for (let i = 0; i < numRows; i++) {
                const tspan = this.nodeFactory(featureId + suffix + "_tspan_" + i, "tspan");
                if (style.labelSelect === true) {
                    tspan._featureId = featureId;
                    tspan._geometry = location;
                    tspan._geometryClass = location.CLASS_NAME;
                }
                if (OpenLayers.IS_GECKO === false) {
                    tspan.setAttributeNS(null, "baseline-shift",
                        OpenLayers.Renderer.SVG.LABEL_VSHIFT[align[1]] || "-35%");
                }
                tspan.setAttribute("x", x);
                if (i == 0) {
                    let vfactor = OpenLayers.Renderer.SVG.LABEL_VFACTOR[align[1]];
                    if (vfactor == null) {
                        vfactor = -0.5;
                    }
                    tspan.setAttribute("dy", (vfactor * (numRows - 1)) + "em");
                } else {
                    tspan.setAttribute("dy", "1em");
                }
                tspan.textContent = (labelRows[i] === '') ? ' ' : labelRows[i];
                if (!tspan.parentNode) {
                    label.appendChild(tspan);
                }
            }

            if (!label.parentNode) {
                this.textRoot.appendChild(label);
            }
        };

        updateStylesFromPreferences(preferences);

        //Add layers to the map
        OLMap.addLayer(streetVectorLayer);
        OLMap.addLayer(labelsVector);
        OLMap.addLayer(nodesVector);

        if (localStorage.getItem("svlDebugOn") === "true") {
            document.sv = streetVectorLayer;
            document.nv = nodesVector;
        }


        //initialisation
        layers = OLMap.getLayersBy("uniqueName", "roads");
        WMERoadLayer = null;
        if (layers.length === 1) {
            WMERoadLayer = layers[0];
        }
        SVLAutomDisabled = false;


        if (preferences.showUnderGPSPoints) { //By default, WME places the GPS points under the layer, no need to move it.
            updateLayerPosition();
        }

        updateRoutingModePanel();
        updateRefreshStatus();

        OLMap.events.register("zoomend", null, manageZoom, true);

        initWazeWrap();

        if (OLMap.zoom <= 1) {
            setLayerVisibility(ROAD_LAYER, true);
        } else if (WMERoadLayer.getVisibility() && preferences.disableRoadLayers) {
            setLayerVisibility(ROAD_LAYER, false);
            console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel.");
        }

        streetVectorLayer.events.register("visibilitychanged", streetVectorLayer, manageVisibilityChanged);
        //Trigger the event manually
        manageVisibilityChanged({
            object: streetVectorLayer
        });

        //TODO remove in the next releases
        $(".olControlAttribution").click(() => { alert("The preferences have been moved to the sidebar on the left. Please look for the \"SVL 🗺️\" tab."); });

        console.log("Street Vector Layer v. " + GM_info.script.version + " initialized correctly.");
    }

    function bootstrapSVL(trials = 0) {
        // Check all requisites for the script

        //TODO: to make loading faster, the document.getElementById can run later
        if (W === undefined || W.map === undefined) {
            console.log("SVL not ready to start, retrying in 600ms");
            trials += 1;
            if (trials < 20) {
                setTimeout(() => { bootstrapSVL(++trials); }, 600);
            } else {
                alert("Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
            }
            return;
        }
        /* begin running the code! */
        initSVL();
    }

    bootstrapSVL();
}());