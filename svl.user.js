// ==UserScript==
// @name       Street Vector Layer
// @namespace  wme-champs-it
// @version    3.4
// @description  Adds a vector layer for drawing streets on the Waze Map editor
// @include    /^https:\/\/(www|editor-beta).waze.com(\/(?!user)\w*-?\w*)?\/editor\/\w*\/?\??[\w|=|&|.]*/
// @updateURL  http://code.waze.tools/repository/475e72a8-9df5-4a82-928c-7cd78e21e88d.user.js
// @author     bedo2991
// @grant      none
// @copyright  2015+, bedo2991
// ==/UserScript==

//debugger;
(function() {
   /* var DEBUG_ENABLED = false; //set it to false for production mode

    if(DEBUG_ENABLED){
        consoleDebug= function()
        {
            if(DEBUG_ENABLED)
                for (var i = 0; i < arguments.length; ++i)
                    console.debug(arguments[i]);
        }
    }
    else
    {
        consoleDebug = function(){}
    }*/
    var svlAttempts=0;
    var clutterConstant;
    var thresholdDistance;
    var streetStyle = [];
    var labelFontSize;
    var streetVector;
    var nodesVector;
    var labelOutlineWidth;
    var clutterCostantFarZoom;
    var clutterCostantNearZoom;
    var svlIgnoredStreets;
    var arrowDeclutter;
    var clutterMax;
    var fontSizeMax;
    var beta;
    var farZoom;
    var svlVersion;
    var  preferences;
    var svlStreetTypes;
    var nonEditableStyle;
    var tunnelFlagStyle2;
    var superScript;

    var tunnelFlagStyle1;
    var roundaboutStyle;
    var tollStyle;
    var closureStyle;
    var validatedStyle;
    var restrStyle;
    var redStyle;
    var nodeStyle;
    var unknownDirStyle;
    var roadLayer;
    var vectorAutomDisabled;

    var farZoomThereshold;

   //End of global variable declaration

    function wbwGlobals() {
            "use strict";
    farZoomThereshold=5; //To increase performance change this value to 6.
    arrowDeclutter = 25;
    clutterMax = 700;
    fontSizeMax = 32;
    beta = false;
    if(W.model.nodes.events == undefined)
        beta=true;
    farZoom = W.map.zoom < farZoomThereshold ? true : false;
    svlVersion = GM_info.script.version;
    preferences=null;
    superScript = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
    svlIgnoredStreets = {8:true,10:true,16:true,17:true,19:true,20:true};
    svlStreetTypes = {
        1: 'Street',
        20:'Parking Lot Road',
        4: 'Ramp',
        3: 'Freeway',
        7: 'Minor Highway',
        6: 'Major Highway',
        16: 'Stairway',
        5: 'Walking Trail',
        8: 'Dirt Road',
        15: 'Ferry',
        18: 'Railroad',
        17: 'Private Road',
        19: 'Runway',
        2: 'Primary Street',
        /*'service': 21,*/
        10: 'Pedestrian Boardwalk'
    };

    OpenLayers.Renderer.symbol.mytriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    nonEditableStyle =
        {
            strokeColor: "#000",
            strokeWidth: 2,
            strokeDashstyle: "solid",
            pointerEvents: "visiblePainted",

        }
    tunnelFlagStyle2 =
        {
        strokeColor: "#C90",
        strokeWidth: 1,
        strokeDashstyle: "longdash",
        pointerEvents: "visiblePainted",
    }
    tunnelFlagStyle1 =
        {
        strokeColor: "#fff",
        strokeWidth: 2,
        strokeDashstyle: "longdash",
        pointerEvents: "visiblePainted",
    }
}

function wbwWazeBits() {
    ////Utilities variable to avoid writing long names
    if(typeof(W) !== "undefined")
    {
        //wazeMap = unsafeWindow.W.map;
        if(typeof(W.map) !== "undefined")
        {
            if(typeof(W.model) !== "undefined" /*&& typeof(selectionManager) !== "undefined"*/)
                return;
        }
    }
    throw "Model Not ready";
}

function refreshWME()
    {
        if(parseInt($('div.counter').text()) == 0)
            $('div.icon-repeat.reload-button').click();
    }

function hasToBeSkipped(roadid)
{
    if(preferences.hideMinorRoads && W.map.getZoom() == 3 && svlIgnoredStreets[roadid]===true)
      return true;
    return false;
}

function rollbackPreferences()
{
    loadPreferences();
    updateStylesFromPreferences(preferences);
    closePrefPanel();
}

function closePrefPanel()
{
    $(document.getElementById('zoomStyleDiv')).hide(400, function(){ $(document.getElementById('zoomStyleDiv')).remove();});
    $(document.getElementById('PrefDiv')).hide(400, function(){ $(document.getElementById('PrefDiv')).remove();});
}

function bestBackground(color)
{
    'use strict';
    var oppositeColor = parseInt(color.substring(1,3),16)*0.299 + parseInt(color.substring(3,5),16)*0.587 + parseInt(color.substring(5,7),16)*0.114;
    if(oppositeColor<127)
    {
        return "#FFF";
    }
    return "#000";
}

function updateStylesFromPreferences(preferences)
{
    for(var i=0, len = preferences.streets.length; i<len; i++)
    {
        if(preferences.streets[i] != null){
            streetStyle[i].strokeColor = preferences.streets[i].strokeColor;
            streetStyle[i].strokeWidth = preferences.streets[i].strokeWidth;
            streetStyle[i].strokeDashstyle = preferences.streets[i].strokeDashstyle;
            streetStyle[i].outlineColor=bestBackground(preferences.streets[i].strokeColor);
        }
    }

    //Red
    redStyle.strokeColor = preferences.red.strokeColor;
    redStyle.strokeWidth = preferences.red.strokeWidth;
    redStyle.strokeDashstyle = preferences.red.strokeDashstyle;

    //Toll
    tollStyle.strokeColor = preferences.toll.strokeColor;
    tollStyle.strokeWidth = preferences.toll.strokeWidth;
    tollStyle.strokeDashstyle = preferences.toll.strokeDashstyle;

    //Restrictions
    restrStyle.strokeColor = preferences.restriction.strokeColor;
    restrStyle.strokeWidth = preferences.restriction.strokeWidth;
    restrStyle.strokeDashstyle = preferences.restriction.strokeDashstyle;

    //Closures
    closureStyle.strokeColor = preferences.closure.strokeColor;
    closureStyle.strokeWidth = preferences.closure.strokeWidth;
    closureStyle.strokeDashstyle = preferences.closure.strokeDashstyle;

    //Rendering
    //Labels
    clutterCostantNearZoom = preferences.clutterCostantNearZoom;
    clutterCostantFarZoom = preferences.clutterCostantFarZoom;
    clutterConstant = farZoom ? preferences.clutterCostantFarZoom :  preferences.clutterCostantNearZoom;
    thresholdDistance = getThreshold();

    //ArrowDeclutter
    arrowDeclutter = preferences.arrowDeclutter;
    labelOutlineWidth = preferences.labelOutlineWidth;

    labelFontSize = farZoom ? preferences.farZoomLabelSize : preferences.closeZoomLabelSize;
    labelOutlineWidth = preferences.labelOutlineWidth+"px";
    //showSLtext = preferences.showSLtext;
    //showSLcolor = preferences.showSLcolor;

    doDraw();
}

function exportPreferences()
{
    prompt("Please copy this string (CTRL+C):", JSON.stringify(preferences));
}

function importPreferences()
{
    var pastedText = prompt("N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:");
    if(pastedText != null && pastedText != ""){
        try{
            preferences = JSON.parse(pastedText);
        }
        catch(ex)
        {
            alert("Your string seems to be somehow wrong. Place check that is a valid JSON string");
            return;
        }
        updateStylesFromPreferences(preferences);
        savePreferences(preferences);
        closePrefPanel();
    }
}

function updatePref()
{
    $('#saveNewPref').attr("style", "background-color:#FFBD24");
    for(var i=0, len = preferences.streets.length; i<len; i++)
    {
        if(preferences.streets[i] != null){
            preferences.streets[i].strokeColor = $('#streetColor_'+i).val();
            preferences.streets[i].strokeWidth = $('#streetWidth_'+i).val();
            preferences.streets[i].strokeDashstyle = $('#strokeDashstyle_'+i+ ' option:selected').val();
        }
    }

    preferences.fakelock = $('#fakeLock').val();

    //Red
    preferences.red.strokeColor = $('#streetColor_red').val();
    preferences.red.strokeWidth = $('#streetWidth_red').val();
    preferences.red.strokeDashstyle = $('#strokeDashstyle_red option:selected').val();

    //Toll
    preferences.toll.strokeColor = $('#streetColor_toll').val();
    preferences.toll.strokeWidth = $('#streetWidth_toll').val();
    preferences.toll.strokeDashstyle = $('#strokeDashstyle_toll option:selected').val();

    //Restrictions

    preferences.restriction.strokeColor = $('#streetColor_restriction').val();
    preferences.restriction.strokeWidth = $('#streetWidth_restriction').val();
    preferences.restriction.strokeDashstyle = $('#strokeDashstyle_restriction option:selected').val();

    //Closures
    preferences.closure.strokeColor = $('#streetColor_closure').val();
    preferences.closure.strokeWidth = $('#streetWidth_closure').val();
    preferences.closure.strokeDashstyle = $('#strokeDashstyle_closure option:selected').val();

    preferences.clutterCostantNearZoom = $('#clutterCostantNearZoom').val();
    preferences.clutterCostantFarZoom =  $('#clutterCostantFarZoom').val();

    preferences.arrowDeclutter = $('#arrowDeclutter').val();
    preferences.labelOutlineWidth = $('#labelOutlineWidth').val();
    preferences.disableRoadLayers = $('#disableRoadLayers').prop('checked');
    preferences.startDisabled = $('#startdisabled').prop('checked');

    preferences.showSLtext = $('#showSLtext').prop('checked');
    preferences.showSLcolor = $('#showSLcolor').prop('checked');
    preferences.showSLSinglecolor = $('#showSLSinglecolor').prop('checked');
    preferences.SLColor = $('#SLColor').val();

    preferences.hideMinorRoads = $('#hideMinorRoads').prop('checked');
    preferences.showDashedUnverifiedSL = $('#showDashedUnverifiedSL').prop('checked');
    preferences.farZoomLabelSize = $('#farZoomLabelSize').val();
    preferences.closeZoomLabelSize = $('#closeZoomLabelSize').val();

    updateStylesFromPreferences(preferences);
}

function saveNewPref()
{
    updatePref();
    savePreferences(preferences);
    closePrefPanel();
}

function rollbackDefault(dontask){
    if(dontask===true || confirm("Are you sure you want to rollback to the default style?\nANY CHANGE WILL BE LOST!"))
    {
        saveDefaultPreferences();
        updateStylesFromPreferences(preferences);
        closePrefPanel();
    }
}

function getColorSpeed(speed)
{
    if(preferences.showSLSinglecolor)
        return preferences.SLColor;
    
    if(W.prefs.attributes.isImperial) // adjust scale for Imperial
    {
        // speeds 15 to 75 mph (7 increments) are tuned to HSL 95 to 395 (35) for easy visual speed differentiation at common speeds
        return ((speed / 1.609344 * 5) + 20) %360
    }
    else
    {
        return (speed * 3) %360; // :150 * 450
    }
}

function editPreferences()
{
    if($(document.getElementById('PrefDiv')).length >0)
        return;
    var $zoomStyleDiv = $('<div id="zoomStyleDiv" class="zoomDiv"></div>');
    if(farZoom){
        $zoomStyleDiv.addClass('farZoom');
        $zoomStyleDiv.text('You are currently in FAR-zoom mode');
    }
    else
    {
        $zoomStyleDiv.addClass('closeZoom');
        $zoomStyleDiv.text('You are currently in CLOSE-zoom mode');
    }
    $(document.getElementById('map')).append($zoomStyleDiv);
    var $style = $('<style>.farZoom{background-color:orange}.closeZoom{background-color:#6495ED}.zoomDiv{opacity: 0.95; font-size:1.2em; border:0.2em black solid; position:absolute; top:8em; right:2em; padding:1em;}.prefElement{margin-right:0.2em;}summary{font-weight:bold}</style>');
    var $mainDiv = $('<div id="PrefDiv" style="padding:0.6em; border-radius:15px; background:white; opacity:0.93; width:23em; position:absolute; top:11em; left:30em; z-index:200"></div>');
    $mainDiv.append($('<div><button id="saveNewPref">Save</button> <button id="rollbackPreferences">Rollback</button> <button id="rollbackDefault">Reset</button><button style="float:right" id="close">X</button></div>'));

    var $elementDiv = $('<div id="PrefDiv" style="padding:5px; width:280px; max-height:450px; overflow:auto"></div>');

    var $streets = $('<details open></details>');
    var $decorations = $('<details></details>');
    var $labels = $('<details></details>');
    var $speedLimits = $('<details></details>');
    $streets.append('<summary>Road Types</summary>');
    for(var i=0, len = preferences.streets.length; i<len; ++i)
    {

        if(preferences.streets[i] != null)
        {
            $streets.append($('<b>'+svlStreetTypes[i]+'</b><br>'));
            $streets.append($('<input class="prefElement"  title="Color" id="streetColor_'+i+'" value="'+preferences.streets[i].strokeColor+'" type="color"></input>&nbsp&nbsp'));
            $streets.append($('<input class="prefElement" title="Width" id="streetWidth_'+i+'" value="'+preferences.streets[i].strokeWidth+'" type="number" min="0" max="15"></input>&nbsp&nbsp'));
            var $select = $('<select class="prefElement" title="Stroke style" id="strokeDashstyle_'+i+'"><option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option></select>');                          
            $select.val(preferences.streets[i].strokeDashstyle);
            $streets.append($select);
            $streets.append('<hr>');
        }
    }

    //Red segments
    $streets.append($('<b>Unnamed Segments</b><br>'));
    $streets.append($('<input class="prefElement"  title="Color" id="streetColor_red" value="'+preferences.red.strokeColor+'" type="color"></input>'));
    $streets.append($('<input class="prefElement" title="Width" id="streetWidth_red" value="'+preferences.red.strokeWidth+'" type="number" min="0" max="15"></input>'));
    var $select = $('<select class="prefElement" title="Stroke style" id="strokeDashstyle_red"><option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option></select>');                          
    $select.val(preferences.red.strokeDashstyle);
    $streets.append($select);
    $streets.append('<hr>');

    $elementDiv.append($streets);

    $decorations.append('<summary>Decorations</summary>');
    $decorations.append('<b>Render map as level</b><br>');
    $decorations.append($('<input class="prefElement" title="fakeLock" id="fakeLock" value="'+W.loginManager.user.getAttributes().normalizedLevel+'" type="number" min="1" max="7"></input>'));
    $decorations.append('<hr>');
    //Toll
    $decorations.append($('<b>Toll</b><br>'));
    $decorations.append($('<input class="prefElement" title="Color" id="streetColor_toll" value="'+preferences.toll.strokeColor+'" type="color"></input>'));
    $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_toll" value="'+preferences.toll.strokeWidth+'" type="number" min="0" max="15"></input>'));
    var $select = $('<select class="prefElement"  title="Stroke style" id="strokeDashstyle_toll"><option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option></select>');                          
    $select.val(preferences.toll.strokeDashstyle);
    $decorations.append($select);
    $decorations.append('<hr>');

    //Restrictions
    $decorations.append($('<b>Restrictions</b><br>'));
    $decorations.append($('<input class="prefElement" title="Color" id="streetColor_restriction" value="'+preferences.restriction.strokeColor+'" type="color"></input>'));
    $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_restriction" value="'+preferences.restriction.strokeWidth+'" type="number" min="0" max="15"></input>'));
    var $select = $('<select class="prefElement"  title="Stroke style" id="strokeDashstyle_restriction"><option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option></select>');                          
    $select.val(preferences.restriction.strokeDashstyle);
    $decorations.append($select);
    $decorations.append('<hr>');

    //Closures
    $decorations.append($('<b>Closures</b><br>'));
    $decorations.append($('<input class="prefElement" title="Color" id="streetColor_closure" value="'+preferences.closure.strokeColor+'" type="color"></input>'));
    $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_closure" value="'+preferences.closure.strokeWidth+'" type="number" min="0" max="15"></input>'));
    var $select = $('<select class="prefElement" title="Stroke style" id="strokeDashstyle_closure"><option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option></select>');                          
    $select.val(preferences.closure.strokeDashstyle);
    $decorations.append($select);
    $decorations.append('<hr>');


    $elementDiv.append($decorations);

    //Labels
    $labels.append('<summary>Rendering Parameters</summary>');
    $labels.append($("<b style='color:#6495ED'>Close Zoom</b><br>"));
    $labels.append($('<br><i>Density (the highest, the less)</i><br>'));
    $labels.append($('<input class="prefElement" title="Quantity" id="clutterCostantNearZoom" value="'+preferences.clutterCostantNearZoom+'" type="range" min="10" max="'+clutterMax+'"></input>'));
        $labels.append($('<br><i>Font Size</i><br>'));
    $labels.append($('<input class="prefElement" title="Quantity" id="closeZoomLabelSize" value="'+preferences.closeZoomLabelSize+'" type="range" min="8" max="'+fontSizeMax+'"></input>'));
    $labels.append('<hr>');

    $labels.append($("<b style='color:orange'>Far Zoom</b><br>"));
    $labels.append($('<br><i>Density (the highest, the less)</i><br>'));
    $labels.append($('<input class="prefElement" title="Quantity" id="clutterCostantFarZoom" value="'+preferences.clutterCostantFarZoom+'" type="range" min="10" max="'+clutterMax+'"></input>'));
    $labels.append($('<br><i>Font Size</i><br>'));
    $labels.append($('<input class="prefElement" title="Quantity" id="farZoomLabelSize" value="'+preferences.farZoomLabelSize+'" type="range" min="8" max="'+fontSizeMax+'"></input>'));
    $labels.append('<hr>');

    $labels.append($('<b>Label outline width</b><br>'));
    $labels.append($('<input class="prefElement" title="Quantity" id="labelOutlineWidth" value="'+preferences.labelOutlineWidth+'" type="range" min="0" max="10"></input>'));
    $labels.append('<hr>');

    $labels.append($('<b>Hide minor roads at zoom 3</b>'));
    $labels.append($('<input class="prefElement" title="True or False" id="hideMinorRoads" type="checkbox" '+(preferences.hideMinorRoads?'checked':'')+'></input>'));
    $labels.append('<hr>');

    //Arrow declutter
    $labels.append($('<b>Arrows (the highest, the less)</b><br>'));
    $labels.append($('<input class="prefElement" title="Quantity" id="arrowDeclutter" value="'+preferences.arrowDeclutter+'" type="range" min="1" max="200"></input>'));
    $labels.append('<hr>');

    $labels.append($('<b>Hide other road layers </b>'));
    $labels.append($('<input class="prefElement" title="True or False" id="disableRoadLayers" type="checkbox" '+(preferences.disableRoadLayers?'checked':'')+'></input>'));
    $labels.append('<hr>');

    $labels.append($('<b>Layer initially disabled</b>'));
    $labels.append($('<input class="prefElement" title="True or False" id="startdisabled" type="checkbox" '+(preferences.startDisabled?'checked':'')+'></input>'));
    $labels.append('<hr>');

    $elementDiv.append($labels);

    //Speed limits
    $speedLimits.append('<summary>Speed Limits</summary>');
    $speedLimits.append($('<b>Show text on streetname</b>'));
    $speedLimits.append($('<input class="prefElement" title="True or False" id="showSLtext" type="checkbox" '+(preferences.showSLtext?'checked':'')+'></input>'));
    $speedLimits.append('<hr>');

    $speedLimits.append($('<b>Show using color scale</b>'));
    $speedLimits.append($('<input class="prefElement" title="True or False" id="showSLcolor" type="checkbox" '+(preferences.showSLcolor?'checked':'')+' ></input>'));
    $speedLimits.append('<hr>');
    $speedLimits.append($('<b>Show using single color</b>'));
    $speedLimits.append($('<input class="prefElement" title="Pick a color" id="SLColor" type="color" value="'+preferences.SLColor+'"></input>'));
    $speedLimits.append($('<input class="prefElement" title="True or False" id="showSLSinglecolor" type="checkbox" '+(preferences.showSLSinglecolor?'checked':'')+'></input>'));
    $speedLimits.append('<hr>');
    $speedLimits.append($('<b>Show unverified limits with a dashed line</b>'));
    $speedLimits.append($('<input class="prefElement" title="True or False" id="showDashedUnverifiedSL" type="checkbox" '+(preferences.showDashedUnverifiedSL?'checked':'')+'></input>'));
    $speedLimits.append('<hr>');

    $speedLimits.append($('<b>Reference colors</b>'));
    $speedLimits.append('<br/>');
    for(var k=W.prefs.attributes.isImperial?9:15; k>1; k--){
        if (W.prefs.attributes.isImperial)
        {
            $speedLimits.append($('<span style="color:hsl('+getColorSpeed((k*10-5)*1.609344)+',100%,50%)">'+(k*10-5)+' </span>'));
        }
        else
        {
            $speedLimits.append($('<span style="color:hsl('+getColorSpeed(k*10)+',100%,50%)">'+k*10+' </span>'));
        }
    }
    $speedLimits.append('<hr>');
    $elementDiv.append($speedLimits);

    $mainDiv.append($elementDiv);
    $mainDiv.append($('<div style="margin-top:2px"><button id="exportPreferences">Export</button> <button id="importPreferences"">Import</button><div>'));
    $('body').append($style);
    $('body').append($mainDiv);
    $('.prefElement').change(updatePref);
    $('#close').click(closePrefPanel);
    $('#saveNewPref').click(saveNewPref);
    $('#updatePref').click(updatePref);
    $('#exportPreferences').click(exportPreferences);
    $('#importPreferences').click(importPreferences);
    $('#rollbackPreferences').click(rollbackPreferences);
    $('#rollbackDefault').click(rollbackDefault);
}

function saveDefaultPreferences()
{
    preferences = {};
    preferences.showSLSinglecolor = false;
    preferences.SLColor = "#ffdf00";
    if(W.loginManager.user)
        preferences.fakelock = W.loginManager.user.getAttributes().normalizedLevel;
    else
        preferences.fakelock=6;
    preferences.hideMinorRoads = false;
    preferences.showDashedUnverifiedSL = true;
    preferences.showSLcolor = true;
    preferences.showSLtext = true;
    preferences.version = svlVersion;
    preferences.disableRoadLayers=true;
    preferences.startDisabled=false;
    preferences.clutterCostantNearZoom=400.0;
    preferences.labelOutlineWidth="3";
    preferences.clutterCostantFarZoom=410.0;
    preferences.streets = [];
    //Street: 1
    preferences.streets[1] ={
        strokeColor: "#FFFFFF",
        outlineColor: "#000",
        strokeWidth: 5,
        strokeDashstyle: "solid"
    };
    //Parking: 20
    preferences.streets[20] ={
        strokeColor: "#2282ab",
        strokeWidth: 5,
        strokeDashstyle: "solid"
    };
    //Ramp: 4
    preferences.streets[4] ={
        strokeColor: "#3FC91C",
        strokeWidth: 6,
        strokeDashstyle: "solid"
    };
    //Freeway: 3
    preferences.streets[3] ={
        strokeColor: "#387FB8",
        strokeWidth: 9,
        strokeDashstyle: "solid"
    };
    //Minor: 7
    preferences.streets[7] ={
        strokeColor: "#ECE589",
        strokeWidth: 7,
        strokeDashstyle: "solid"
    };
    //Major: 6
    preferences.streets[6] ={
        strokeColor: "#C13040",
        strokeWidth: 8,
        strokeDashstyle: "solid"
    };
    //Stairway: 16
    preferences.streets[16] ={
        strokeColor: "#B700FF",
        strokeWidth: 3,
        strokeDashstyle: "dash"
    };
    //Walking: 5
    preferences.streets[5] ={
        strokeColor: "#00FF00",
        strokeWidth: 3,
        strokeDashstyle: "dash"
    };
    //Dirty: 8
    preferences.streets[8] ={
        strokeColor: "#82614A",
        strokeWidth: 5,
        strokeDashstyle: "solid"
    };
    //Ferry: 15
    preferences.streets[15] ={
        strokeColor: "#FF8000",
        strokeWidth: 3,
        strokeDashstyle: "dashdot"
    };
    //Railroad: 18
    preferences.streets[18] ={
        strokeColor: "#FFFFFF",
        strokeWidth: 4,
        strokeDashstyle: "dash"
    };
    //Private: 17
    preferences.streets[17] ={
        strokeColor: "#00FFB3",
        strokeWidth: 4,
        strokeDashstyle: "solid"
    };
    //Runway: 19
    preferences.streets[19] ={
        strokeColor: "#00FF00",
        strokeWidth: 4,
        strokeDashstyle: "dashdot"
    };
    //Primary: 2
    preferences.streets[2] ={
        strokeColor: "#CBA12E",
        strokeWidth: 6,
        strokeDashstyle: "solid"
    };
    //Pedestrian: 10
    preferences.streets[10] ={
        strokeColor: "#0000FF",
        strokeWidth: 6,
        strokeDashstyle: "dash"
    };
    //Red segments (without names)
    preferences.red ={
        strokeColor: "#FF0000",
        strokeWidth: 6,
        strokeDashstyle: "solid"
    };

    preferences.roundabout ={
        strokeColor: "#111",
        strokeWidth: 1,
        strokeDashstyle: "dash"
    };
    preferences.toll ={
        strokeColor: "#00E1FF",
        strokeWidth: 2,
        strokeDashstyle: "solid"
    };
    preferences.closure ={
        strokeColor: "#FF00FF",
        strokeWidth: 4,
        strokeDashstyle: "dash"
    };
    preferences.restriction ={
        strokeColor: "#F2FF00",
        strokeWidth: 2,
        strokeDashstyle: "dash"
    };
    preferences.arrowDeclutter=10;
    savePreferences(preferences);
}

function savePreferences(preferences)
{
    preferences.version = svlVersion;
    localStorage.setItem('svl', JSON.stringify(preferences));
}

function loadPreferences()
{
    preferences = JSON.parse(localStorage.getItem('svl'));
    //consoleDebug("Loading preferences");
    if(preferences == null)
    {
        //consoleDebug("Creating new preferences from default");
        saveDefaultPreferences();
        return false;
    }
    return true;
}


function checkZoomLayer()
{
    var zoom = W.map.getZoom();
    //consoleDebug("Zoom: "+ zoom);
    if(preferences.disableRoadLayers && zoom > 1 && vectorAutomDisabled)
    {
        roadLayer.setVisibility(false);
    }
    if(zoom>1)
    {
        if(streetVector.visibility==false && vectorAutomDisabled)
        {
            vectorAutomDisabled=false;
            //consoleDebug("Setting vector visibility to true");
            streetVector.setVisibility(true);
            doDraw();
            //streetVector.display(true)
        }
    }
    if(zoom >= farZoomThereshold)
    {
        //Close zoom
        clutterConstant = preferences.clutterCostantNearZoom;
        labelFontSize = preferences.closeZoomLabelSize+"px";
        if(farZoom)
        {//Switched from far to close zoom
            farZoom=false;
            thresholdDistance=getThreshold();
            if(beta){
                W.model.nodes._events["objectsremoved"].push({context:nodesVector, callback: removeNodes, svl:true});
                W.model.nodes._events["objectsadded"].push({context:nodesVector, callback: addNodes, svl:true});
            }
            else
            {
                W.model.nodes.events.register("objectsremoved", nodesVector, removeNodes);
                W.model.nodes.events.register("objectsadded", nodesVector, addNodes);
            }
            if($('#zoomStyleDiv').length==1)
            {
                $('#zoomStyleDiv').removeClass('farZoom');
                $('#zoomStyleDiv').addClass('closeZoom');
                $('#zoomStyleDiv').text('You are currently in CLOSE-zoom mode');
            }
            doDraw();
        }
    }
    else
    {
        //Far zoom
        var zoomChanged =  !farZoom ? true : false;
        farZoom=true;
        clutterConstant = preferences.clutterCostantFarZoom;
        labelFontSize = preferences.farZoomLabelSize+"px";
        thresholdDistance=getThreshold();
        if(zoomChanged){
            if(beta){
                W.model.nodes._events["objectsremoved"].filter(removeSVLEvents);
                W.model.nodes._events["objectsadded"].filter(removeSVLEvents);
            }
            else
            {
                W.model.nodes.events.unregister("objectsremoved", nodesVector, removeNodes);
                W.model.nodes.events.unregister("objectsadded", nodesVector, addNodes);
            }
            if($('#zoomStyleDiv').length==1)
            {
                $('#zoomStyleDiv').removeClass('closeZoom');
                $('#zoomStyleDiv').addClass('farZoom');
                $('#zoomStyleDiv').text('You are currently in FAR-zoom mode');
            }
            nodesVector.destroyFeatures();
            doDraw();
        }
        if(zoom < 2)
        { //There is nothing to draw, enable road layer
            //consoleDebug("Road layer automatically enabled because of zoom out");
            //consoleDebug("Vector visibility: ", streetVector.visibility);
            if(streetVector.getVisibility()===true)
            {
                //consoleDebug("Setting vector visibility to false");
                streetVector.setVisibility(false);
                vectorAutomDisabled=true;
                roadLayer.setVisibility(true);
            }
        }
    }
}
    function toggleLayerVisibility(){
        //consoleDebug("Toggling svl layer visibility");
        if(!farZoom){
            streetVector.setVisibility(!streetVector.getVisibility());
        }
    }

function initSVL() {
    //Initialize variables

    try{
        wbwWazeBits();
    }
    catch (e)
    {
        svlAttempts++;
        if(svlAttempts<10){
            console.warn(e);
            console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
            setTimeout(initSVL,500);
            return;
        }
        else
        {
            console.error(e);
            alert("Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.");
            return;
        }
    }

    wbwGlobals();

    if(loadPreferences() == false)
    {
        //First run, or new broswer
        alert("This is the first time that you run Street Vector Layer in this browser.\n"
              +"Some info about it:\n"
              +"By default, use ALT+L to toggle the layer.\n"
              +"You can change the streets color, thickness and style by clicking on the attribution bar at the bottom of the editor.\n"
              +"Your preferences will be saved for the next time in your browser.\n"
              +"The other road layers will be automatically hidden. (You can change this behaviour in the preference panel).\n"
              +"Have fun and tell us if you liked the script!");
    }
    else{
        if(preferences.SLColor== null || preferences.showSLcolor == null || preferences.showSLtext == null || preferences.clutterCostantNearZoom == null || preferences.labelOutlineWidth==null || preferences.disableRoadLayers==null || preferences.startDisabled == null)
        {
            preferences.SLColor = preferences.SLColor? preferences.SLColor : "#ffdf00";
            preferences.showSLcolor = preferences.showSLcolor?preferences.showSLcolor: true;
            preferences.showSLtext = preferences.showSLtext? preferences.showSLtext:true;
            preferences.startDisabled=preferences.startDisabled?preferences.startDisabled:false;
            preferences.labelOutlineWidth=  preferences.labelOutlineWidth?  preferences.labelOutlineWidth:"3";
            preferences.disableRoadLayers=preferences.disableRoadLayers?preferences.disableRoadLayers:true;
            preferences.clutterCostantNearZoom =preferences.clutterCostantNearZoom?preferences.clutterCostantNearZoom: 350; //float value, the highest the less label will be generated. Zoom >=5
            preferences.clutterCostantFarZoom = preferences.clutterCostantFarZoom? preferences.clutterCostantFarZoom: 410; //float value, the highest the less label will be generated. Zoom <5
            prompt("!!! IMPORTANT !!!\nStreet Vector layer got updated to the version "+svlVersion+ " and needs to update your saved preferences in order to keep working.\nHere is a backup of your previous settings.\nCopy it and import it later if you have made any change that you'd like to keep.", JSON.stringify(preferences));
            saveDefaultPreferences();
        }
    }

    clutterConstant = farZoom ? preferences.clutterCostantFarZoom : preferences.clutterCostantNearZoom;
    thresholdDistance = getThreshold();
    if(preferences.farZoomLabelSize == null || preferences.closeZoomLabelSize==null || preferences.labelOutlineWidth ==null){
        preferences.labelOutlineWidth = 3;
        preferences.farZoomLabelSize = 11;
        preferences.closeZoomLabelSize = 11;
    }
    labelFontSize = (farZoom?preferences.farZoomLabelSize:preferences.closeZoomLabelSize) + "px";
    labelOutlineWidth = preferences.labelOutlineWidth+"px";


    $('.olControlAttribution').click(editPreferences);
    $('.olControlScaleLineTop').click(editPreferences);
    $('.olControlScaleLineBottom').click(editPreferences);
        var labelStyleMap = new OpenLayers.StyleMap({
                    fontFamily: "Open Sans, Alef, helvetica, sans-serif, monospace",
                    fontWeight: "800",
                    fontColor: "${color}",
                    labelOutlineColor: "${outlinecolor}",
                    fontSize: "${fsize}",
                    labelXOffset: 0,
                    labelYOffset:0,//(attributes.id%2==0?1:-2.6)*7,
                   // fontColor: streetStyle[attributes.roadType]?streetStyle[attributes.roadType].strokeColor:"#f00",
                    //labelOutlineColor:  streetStyle[attributes.roadType]?streetStyle[attributes.roadType].outlineColor:"#fff",
                    labelOutlineWidth:"${outlinewidth}",
                    label : "${label}",
                    //label: directionArrow + " " + streetPart+ " " + directionArrow+ " "+speedPart,
                    angle: "${angle}",
                    //angle: degrees,
                    labelAlign: "cm"//set to center middle
    });
    var layername= "Street Vector Layer";

    streetVector = new OpenLayers.Layer.Vector(layername,
                                               {
                                                   styleMap: labelStyleMap,
                                                   uniqueName: 'vectorstreet',
                                                   shortcutKey:'A+l',
                                                   displayInLayerSwitcher:true,
                                                   accelerator: "toggle" + layername.replace(/\s+/g,''),
                                                   visibility: true,
                                                   isBaseLayer: false,
                                                   isVector: true,
                                                   sphericalMercator: true,
                                                   attribution: "Street Vector Layer"
                                               });
    streetVector.renderer.drawText = function (e,t,i){var n=!!t.labelOutlineWidth;if(n){var s=OpenLayers.Util.extend({},t);s.fontColor=s.labelOutlineColor,s.fontStrokeColor=s.labelOutlineColor,s.fontStrokeWidth=t.labelOutlineWidth,delete s.labelOutlineWidth,this.drawText(e,s,i)}var r=this.getResolution();var layer=this.map.getLayer(this.container.id);var feature=layer.getFeatureById(e);i=(feature.attributes.centroid?feature.attributes.centroid:i);o=(i.x-this.featureDx)/r+this.left,a=i.y/r-this.top,l=n?this.LABEL_OUTLINE_SUFFIX:this.LABEL_ID_SUFFIX,u=this.nodeFactory(e+l,"text");u.setAttributeNS(null,"x",o),u.setAttributeNS(null,"y",-a);if(t.angle||t.angle==0){var rotate='rotate('+t.angle+','+o+","+-a+')';u.setAttributeNS(null,"transform",rotate);}t.fontColor&&u.setAttributeNS(null,"fill",t.fontColor),t.fontStrokeColor&&u.setAttributeNS(null,"stroke",t.fontStrokeColor),t.fontStrokeWidth&&u.setAttributeNS(null,"stroke-width",t.fontStrokeWidth),t.fontOpacity&&u.setAttributeNS(null,"opacity",t.fontOpacity),t.fontFamily&&u.setAttributeNS(null,"font-family",t.fontFamily),t.fontSize&&u.setAttributeNS(null,"font-size",t.fontSize),t.fontWeight&&u.setAttributeNS(null,"font-weight",t.fontWeight),t.fontStyle&&u.setAttributeNS(null,"font-style",t.fontStyle),t.labelSelect===!0?(u.setAttributeNS(null,"pointer-events","visible"),u._featureId=e):u.setAttributeNS(null,"pointer-events","none");var h=t.labelAlign||OpenLayers.Renderer.defaultSymbolizer.labelAlign;u.setAttributeNS(null,"text-anchor",OpenLayers.Renderer.SVG.LABEL_ALIGN[h[0]]||"middle"),OpenLayers.IS_GECKO===!0&&u.setAttributeNS(null,"dominant-baseline",OpenLayers.Renderer.SVG.LABEL_ALIGN[h[1]]||"central");for(var c=t.label.split("\n"),d=c.length;u.childNodes.length>d;)u.removeChild(u.lastChild);for(var p=0;d>p;p++){var g=this.nodeFactory(e+l+"_tspan_"+p,"tspan");if(t.labelSelect===!0&&(g._featureId=e,g._geometry=i,g._geometryClass=i.CLASS_NAME),OpenLayers.IS_GECKO===!1&&g.setAttributeNS(null,"baseline-shift",OpenLayers.Renderer.SVG.LABEL_VSHIFT[h[1]]||"-35%"),g.setAttribute("x",o),0==p){var f=OpenLayers.Renderer.SVG.LABEL_VFACTOR[h[1]];null==f&&(f=-.5),g.setAttribute("dy",f*(d-1)+"em")}else g.setAttribute("dy","1em");g.textContent=""===c[p]?" ":c[p],g.parentNode||u.appendChild(g)}u.parentNode||this.textRoot.appendChild(u)}
    nodesVector = new OpenLayers.Layer.Vector("Nodes Vector",
                                              {
                                                  uniqueName: 'vectorNodes',
                                                  shortcutKey:'A+n',
                                                  visibility: true,
                                                  displayInLayerSwitcher:false,
                                                  isBaseLayer: false,
                                                  sphericalMercator: true
                                              });

    //Street types
    for(var i=0, len = preferences.streets.length; i<len; i++)
    {

        if(preferences.streets[i] != null){
            streetStyle[i] = {
                strokeColor: preferences.streets[i].strokeColor,
                strokeWidth: preferences.streets[i].strokeWidth,
                strokeDashstyle: preferences.streets[i].strokeDashstyle,
                outlineColor: bestBackground(preferences.streets[i].strokeColor),
                pointerEvents: "none"
            };
        }
    }
    roundaboutStyle = {
        strokeColor: preferences.roundabout.strokeColor,
        strokeWidth: preferences.roundabout.strokeWidth,
        strokeDashstyle: preferences.roundabout.strokeDashstyle,
        strokeOpacity: 0.9,
        pointerEvents: "none"
    };
    tollStyle = {
        strokeColor: preferences.toll.strokeColor,
        strokeWidth: preferences.toll.strokeWidth,
        strokeDashstyle: preferences.toll.strokeDashstyle,
        strokeOpacity: 0.9,
        pointerEvents: "none"
    };
    closureStyle = {
        strokeColor: preferences.closure.strokeColor,
        strokeWidth: preferences.closure.strokeWidth,
        strokeDashstyle: preferences.closure.strokeDashstyle,
        pointerEvents: "none"
    };
    validatedStyle = {
        strokeColor: "#F53BFF",
        strokeWidth: 3,
        strokeDashstyle: "solid",
        pointerEvents: "none"
    };
    restrStyle = {
        strokeColor: preferences.restriction.strokeColor,
        strokeWidth: preferences.restriction.strokeWidth,
        strokeDashstyle: preferences.restriction.strokeDashstyle,
        pointerEvents: "none"
    };
    redStyle = {
        strokeColor: preferences.red.strokeColor,
        strokeWidth: preferences.red.strokeWidth,
        strokeDashstyle: preferences.red.strokeDashstyle,
        pointerEvents: "none"
    };
    nodeStyle = {
        stroke:false,
        fillColor: "#0015FF",
        fillOpacity: 0.6,
        pointRadius: 4.0,
        pointerEvents: "none"
    };
    unknownDirStyle = {
        graphicName:"x",
        strokeColor:"#f00",
        strokeWidth:1.5,
        fillColor:"#FFFF40",
        fillOpacity:0.7,
        pointRadius: 7,
        pointerEvents: "none"
    };

    clutterCostantNearZoom = preferences.clutterCostantNearZoom ? preferences.clutterCostantNearZoom : 350.0; //float value, the highest the less label will be generated. Zoom >=5
    clutterCostantFarZoom = preferences.clutterCostantFarZoom ? preferences.clutterCostantFarZoom: 410.0; //float value, the highest the less label will be generated. Zoom <5
    arrowDeclutter = preferences.arrowDeclutter? preferences.arrowDeclutter:  25;

    //var segmentLayer = W.map.getLayersByName("Segments");

    W.map.addLayer(streetVector);
    W.map.addLayer(nodesVector);
    W.map.raiseLayer(streetVector, -2);
    W.map.raiseLayer(nodesVector, -1);

    streetVector.events.register("visibilitychanged",streetVector, manageNodes);
    manageNodes({object:streetVector});
    try{
        roadLayer = W.map.getLayersBy("uniqueName","roads")[0];
    }
    catch(e)
    {
        console.warn("An error happened while retrieving the road layers");
        roadLayer=null;
    }
    if(roadLayer!=null){
        if(W.map.getZoom() <= 1)
        {
            roadLayer.setVisibility(true);
        }
        else if(roadLayer.getVisibility() && preferences.disableRoadLayers)
        {
                roadLayer.setVisibility(false);
                console.log("Roads layers were disabled by Street Vector Layer. You can change this behaviour in the preference panel.");
        }
    }
    vectorAutomDisabled=false;
    W.map.events.register("zoomend", null, checkZoomLayer);

    if(preferences.startDisabled)
    {
        streetVector.setVisibility(false);
    }

    //setInterval(refreshWME, 20000);//TODO Add it as an option, make the timer customizable
    console.log("Street Vector Layer v. "+svlVersion+" initialized correctly." );
}

function getThreshold()
{
    if(clutterConstant == clutterMax)
        return 0;
    return clutterConstant / W.map.getZoom();
}
function manageNodes(e)
{
    //Toggle node layer visibility accordingly
    //consoleDebug("Manage nodes", e);
    nodesVector.setVisibility(e.object.visibility);

    if(e.object.visibility)
    {
        //consoleDebug("Registering events");
        if(beta)
        {
            W.model.segments._events["objectsadded"].push({context: streetVector, callback: addSegments, svl:true});
            W.model.segments._events["objectschanged"].push({context: streetVector, callback: editSegments, svl:true});
            W.model.segments._events["objectsremoved"].push({context: streetVector, callback: removeSegments, svl:true});

            W.model.nodes._events["objectsremoved"].push({context: nodesVector, callback:removeNodes, svl:true});
            W.model.nodes._events["objectsadded"].push({context: nodesVector, callback:addNodes, svl:true});
        }
        else
        {
            W.model.segments.events.register("objectsadded",streetVector, addSegments);
            W.model.segments.events.register("objectschanged", streetVector, editSegments);
            W.model.segments.events.register("objectsremoved",streetVector, removeSegments);

            W.model.nodes.events.register("objectsremoved", nodesVector, removeNodes);
            W.model.nodes.events.register("objectsadded", nodesVector, addNodes);
        }
        doDraw();
    }
    else
    {
        //consoleDebug("Unregistering events");
        if(beta){
            W.model.segments._events["objectsadded"].filter(removeSVLEvents);
            W.model.segments._events["objectsadded"].filter(removeSVLEvents);
            W.model.segments._events["objectschanged"].filter(removeSVLEvents);
            W.model.segments._events["objectsremoved"].filter(removeSVLEvents);

            W.model.nodes._events["objectsremoved"].filter(removeSVLEvents);
            W.model.nodes._events["objectsadded"].filter(removeSVLEvents);
        }
        else
        {
            W.model.segments.events.unregister("objectsadded",streetVector, addSegments);
            W.model.segments.events.unregister("objectschanged", streetVector, editSegments);
            W.model.segments.events.unregister("objectsremoved",streetVector, removeSegments);

            W.model.nodes.events.unregister("objectsremoved", nodesVector, removeNodes);
            W.model.nodes.events.unregister("objectsadded", nodesVector, addNodes);
        }
        nodesVector.destroyFeatures();
        streetVector.destroyFeatures();
    }
}

function removeSVLEvents(event)
{
    return event.svl;
}

function getEffectiveLock(model)
{
   return 1 + (model.attributes.lockRank == null? model.attributes.rank : model.attributes.lockRank);
}
function drawSegment(model)
{
        "use strict";
    var pointList = [];
    var lineString;
    var attributes = model.attributes;
    if(hasToBeSkipped(attributes.roadType))
        return [];
    var points = attributes.geometry.components;
    var pointList =attributes.geometry.getVertices();
    var simplified = new OpenLayers.Geometry.LineString(pointList).simplify(1.5).components;
    var maxDistance = 0;
    var maxDistanceIndex=-1;
    var address = model.getAddress();
    var myFeatures = [];
    //consoleDebug(address);
    if(null != address.street && !address.street.isEmpty || (preferences.showSLtext && attributes.fwdMaxSpeed | attributes.revMaxSpeed)){
        for(var p=0, len = simplified.length-1; p<len; ++p) {
            var distance = simplified[p].distanceTo(simplified[p+1]);
            if(distance > maxDistance)
            {
                maxDistance = distance;
                maxDistanceIndex = p;
                lineString = new OpenLayers.Geometry.LineString([simplified[p],simplified[p+1]]);
            }
        }
    }
    var lineFeature = null;
    if(null == attributes.primaryStreetID)
    {
        //consoleDebug("RED segment", model);
        lineFeature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  redStyle);
        myFeatures.push(lineFeature);
    }else if(typeof streetStyle[attributes.roadType] !== undefined){
        var locked = false;
        var speed = null;
        speed = attributes.fwdMaxSpeed?attributes.fwdMaxSpeed:attributes.revMaxSpeed;
        //consoleDebug("Road Type: ", attributes.roadType);
        if(attributes.level>0) //it is a bridge
        {
            //consoleDebug("Bridge");
            var bridgeStyle =
                {
                strokeColor: "#000",
                strokeWidth: parseInt(streetStyle[attributes.roadType].strokeWidth)+(speed&&preferences.showSLcolor&&!farZoom?6:4),
                //strokeDashstyle: "solid",
                pointerEvents: "visiblePainted",

                }
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  bridgeStyle);
            myFeatures.push(lineFeature);
        }

        if(speed && !farZoom && preferences.showSLcolor) //it has a speed limit
        {
            //consoleDebug("SpeedLimit");
            var speedStrokeStyle= (preferences.showDashedUnverifiedSL && (attributes.fwdMaxSpeedUnverified||attributes.revMaxSpeedUnverified) ? "dash":"solid");

            if(!preferences.showSLSinglecolor && attributes.fwdMaxSpeed && attributes.revMaxSpeed && attributes.fwdMaxSpeed != attributes.revMaxSpeed)
            {
                //consoleDebug("The segment has 2 different speed limits");
                speed = getColorSpeed(attributes.fwdMaxSpeed);
                var speedStyleLeft =
                {
                    strokeColor: speed.toString().charAt(0)=='#'?speed:"hsl("+speed+", 100%, 50%)",
                    strokeWidth: streetStyle[attributes.roadType].strokeWidth,
                    strokeDashstyle: speedStrokeStyle,
                    pointerEvents: "visiblePainted",
                }
                speed = getColorSpeed(attributes.revMaxSpeed);
                var speedStyleRight =
                {
                    strokeColor: speed.toString().charAt(0)=='#'?speed:"hsl("+speed+", 100%, 50%)",
                    strokeWidth: streetStyle[attributes.roadType].strokeWidth,
                    strokeDashstyle: speedStrokeStyle,
                    pointerEvents: "visiblePainted",
                }
                //It has 2 different speeds:
                var left = [];
                var right = [];
                var maxdx=streetStyle[attributes.roadType].strokeWidth/4;
                var maxdy=streetStyle[attributes.roadType].strokeWidth/4;
                for(var k=0, len = pointList.length-1; k<len; k++)
                {
                    var pk = pointList[k];
                    var pk1 = pointList[k+1];
                    var dx = pk.x-pk1.x;
                    var dy = pk.y-pk1.y;
                    left[0] = pk.clone();
                    right[0] = pk.clone();
                    left[1] = pk1.clone();
                    right[1] = pk1.clone();
                    var offset = (streetStyle[attributes.roadType].strokeWidth/5.0)*(18/(W.map.getZoom()*W.map.getZoom()))//((W.map.getZoom()+1)/11)+0.6*(1/(11-W.map.getZoom()));// (10-W.map.getZoom()/3)/(10-W.map.getZoom());
                    if(Math.abs(dx)<0.5)
                    {//segment is vertical
                        if(dy>0){
                            left[0].move(-offset, 0);
                            left[1].move(-offset, 0);
                            right[0].move(offset, 0);
                            right[1].move(offset, 0);
                        }
                        else
                        {
                            left[0].move(offset, 0);
                            left[1].move(offset, 0);
                            right[0].move(-offset, 0);
                            right[1].move(-offset, 0);
                        }
                    }
                    else
                    {
                        var m= dy/dx;
                        var mb = -1/m;
                        //consoleDebug("m: ", m);
                        if(Math.abs(m)<0.05)
                        {
                            //Segment is horizontal
                            if(dx > 0){
                                left[0].move(0, offset);
                                left[1].move(0, offset);
                                right[0].move(0, -offset);
                                right[1].move(0, -offset);
                            }
                            else
                            {
                                left[0].move(0, -offset);
                                left[1].move(0, -offset);
                                right[0].move(0, offset);
                                right[1].move(0, offset);
                            }
                        }
                        else
                        {
                            if(dy>0 && dx>0 || (dx<0 && dy>0)){ //1st and 4th q.
                                offset*=-1;
                            }
                            var temp = Math.sqrt(1+(mb*mb));
                            left[0].move(offset/temp, offset*(mb/temp));
                            left[1].move(offset/temp, offset*(mb/temp));
                            right[0].move(-offset/temp, -offset*(mb/temp));
                            right[1].move(-offset/temp, -offset*(mb/temp));
                        }
                    }
                    //consoleDebug("Adding 2 speeds");
                    //consoleDebug(left);
                    //consoleDebug(right);
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(left), {myId:attributes.id},  speedStyleLeft);
                    myFeatures.push(lineFeature);
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(right), {myId:attributes.id},  speedStyleRight);
                    myFeatures.push(lineFeature);
                }
            }
            else{
                speed = getColorSpeed(attributes.fwdMaxSpeed?attributes.fwdMaxSpeed:attributes.revMaxSpeed);
                        var speedStyle =
                            {
                                strokeColor: speed.toString().charAt(0)=='#'?speed:"hsl("+speed+", 100%, 50%)",
                                strokeWidth: parseInt(streetStyle[attributes.roadType].strokeWidth)+4,
                                strokeDashstyle: speedStrokeStyle,
                                pointerEvents: "visiblePainted",
                            }
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  speedStyle);
                myFeatures.push(lineFeature);
            }
        }

        lineFeature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  streetStyle[attributes.roadType]);
        myFeatures.push(lineFeature);

        if(attributes.level<0)
        {
            var tunnelsStyle =
                {
                    strokeColor: "#000",
                    strokeWidth: parseInt(streetStyle[attributes.roadType].strokeWidth),
                    strokeOpacity: 0.35,
                    strokeDashstyle: "solid",
                    pointerEvents: "visiblePainted",
                }
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  tunnelsStyle);
            myFeatures.push(lineFeature);
        }

        if(model.isLockedByHigherRank() || (preferences.fakelock) < getEffectiveLock(model))
        {
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  nonEditableStyle);
            myFeatures.push(lineFeature);
            locked=true;
        }
    }
    //Check segment properties

    if(!farZoom){
        if(attributes.hasClosures)
        {
            var lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  closureStyle);
            myFeatures.push(lineFeature);
        }
        if(null != attributes.junctionID)
        {//It is a roundabout
            //consoleDebug("Segment is a roundabout");
            var lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  roundaboutStyle);
            myFeatures.push(lineFeature);
        }

        if(!locked && (attributes.fwdToll || attributes.revToll))
        {//It is a toll road
            //consoleDebug("Segment is toll");
            var lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  tollStyle);
            myFeatures.push(lineFeature);
        }
        if(attributes.fwdRestrictions){
            if(attributes.fwdRestrictions.length>0 || attributes.revRestrictions.length>0 )
            {//It has restrictions
                //consoleDebug("Segment has restrictions");
                var lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},  restrStyle);
                myFeatures.push(lineFeature);
            }
        }

        if(!locked && attributes.validated === false)
        {//Segments that needs validation
            var lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id}, validatedStyle);
            myFeatures.push(lineFeature);
        }

        if((attributes.fwdDirection == false || attributes.revDirection == false))
        {
            //consoleDebug("The segment is oneway or has unknown direction");
            var simplifiedPoints = points;
            if(attributes.junctionID==null && attributes.length / points.length < arrowDeclutter){
                simplifiedPoints = simplified;
            }

            if((attributes.fwdDirection | attributes.revDirection) == false){
                //Unknown direction
                for(var p=0, len = simplifiedPoints.length-1; p<len; p++) {
                    //var shape = OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]).getCentroid(true), 2, 6, 0); // origin, size, edges, rotation
                    var arrowFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]).getCentroid(true), {myId:attributes.id}, unknownDirStyle);
                    myFeatures.push(arrowFeature);
                }
            }
            else{
                //Draw normal arrows
                var step = attributes.junctionID != null ? 3:1; //It is a roundabout
                for(var p=step-1, len = simplifiedPoints.length-1; p<len; p+=step) {
                    //it is one way
                    var dx=0, dy=0;
                    if(attributes.fwdDirection){
                        dx = simplifiedPoints[p+1].x-simplifiedPoints[p].x;
                        dy = simplifiedPoints[p+1].y-simplifiedPoints[p].y;
                    }
                    else
                    {
                        dx = simplifiedPoints[p].x-simplifiedPoints[p+1].x;
                        dy = simplifiedPoints[p].y-simplifiedPoints[p+1].y;
                    }
                    var angle = Math.atan2(dx,dy);
                    var degrees = angle*180/Math.PI;//360-(...) -90 removed from here
                    var segmentLenght=simplifiedPoints[p].distanceTo(simplifiedPoints[p+1]);
                    var minDistance = 15.0*(11-W.map.getZoom());
                    if(segmentLenght<minDistance*2){
                        var segmentLineString = new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]);
                        arrowFeature = new OpenLayers.Feature.Vector(segmentLineString.getCentroid(true), {myId:attributes.id},
                                                                     {
                            graphicName: "mytriangle",
                            rotation:degrees,
                            stroke:true,
                            strokeColor:"#000",
                            strokeWidth:1.5,
                            fill:true,
                            fillColor:"#fff",
                            fillOpacity:0.7,
                            pointRadius: 5,
                            pointerEvents: "none"
                        }
                                                                );
                        myFeatures.push(arrowFeature);
                    }
                    else
                    {
                        var dx = simplifiedPoints[p+1].x - simplifiedPoints[p].x;
                        var dy = simplifiedPoints[p+1].y - simplifiedPoints[p].y;

                        var numPoints = Math.floor(Math.sqrt(dx * dx + dy * dy) / minDistance) - 1;

                        var stepx = dx / numPoints;
                        var stepy = dy / numPoints;
                        var px = simplifiedPoints[p].x + stepx;
                        var py = simplifiedPoints[p].y + stepy;
                        for (var ix = 0; ix < numPoints; ix++)
                        {
                            arrowFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(px, py), {myId:attributes.id},
                                                                         {
                                graphicName: "mytriangle",
                                rotation:degrees,
                                stroke:true,
                                strokeColor:"#000",
                                strokeWidth:1.5,
                                fill:true,
                                fillColor:"#fff",
                                fillOpacity:0.7,
                                pointRadius: 5,
                                pointerEvents: "none"
                            }
                                                                        );
                            myFeatures.push(arrowFeature);
                            px += stepx;
                            py += stepy;
                        }
                    }
                }
            }
        }
    }

    if(attributes.flags & 1)
    {//The tunnel flag is enabled
        lineFeature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},   tunnelFlagStyle1);
        myFeatures.push(lineFeature);
                lineFeature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString(pointList), {myId:attributes.id},   tunnelFlagStyle2);
        myFeatures.push(lineFeature);
    }
    //consoleDebug("Maxdistance:", maxDistance, "Threshold:", thresholdDistance);
    if(thresholdDistance && maxDistance >= thresholdDistance)
    {
        var labelFeature = null;
        if((attributes.fwdMaxSpeed|attributes.revMaxSpeed) || (address.street && !address.street.isEmpty))
        {
            //consoleDebug("Label can be inserted");
            labelFeature = new OpenLayers.Feature.Vector(lineString.getCentroid(true),{myId:attributes.id});/*Important pass true parameter otherwise it will return start point as centroid*/
            var streetPart = (address.street != null && !address.street.isEmpty?address.street.name:"");

            if(! streetStyle[attributes.roadType])
               {
                   streetPart+= "\n!! UNSUPPORTED ROAD TYPE !!";
               }
            var speedPart ="";
            if(speed && preferences.showSLtext){
                if(attributes.fwdMaxSpeed == attributes.revMaxSpeed)
                {
                    speedPart = getSuperScript(attributes.fwdMaxSpeed);
                }
                else{
                    if(attributes.fwdMaxSpeed)
                    {
                       speedPart = getSuperScript(attributes.fwdMaxSpeed)
                       if(attributes.revMaxSpeed)
                       {
                           speedPart += "'"+getSuperScript(attributes.revMaxSpeed);
                       }
                    }
                    else
                    {
                       speedPart = getSuperScript(attributes.revMaxSpeed)
                       if(attributes.fwdMaxSpeed)
                       {
                           speedPart += "'"+getSuperScript(attributes.fwdMaxSpeed);
                       }
                    }
                }
                if(attributes.fwdMaxSpeedUnverified | attributes.revMaxSpeedisVerified)
                {
                    speedPart+='?';
                }
            }

            var dx=0, dy=0;
            var p=maxDistanceIndex;
            if(maxDistance > streetPart.length * 2.1 * (8-W.map.getZoom()) + Math.random() * 60)
            {
                    //consoleDebug("Label inserted");
                    if(attributes.fwdDirection){
                        dx = simplified[p+1].x-simplified[p].x;
                        dy = simplified[p+1].y-simplified[p].y;
                    }
                    else
                    {
                        dx = simplified[p].x-simplified[p+1].x;
                        dy = simplified[p].y-simplified[p+1].y;
                    }
                    var angle = Math.atan2(dx,dy);
                    var degrees = 90 + angle*180/Math.PI;
                    var directionArrow = " ▶ ";
                    if(degrees>90 && degrees < 270)
                    {
                        degrees-=180;
                            //directionArrow = " ▶ ";
                    }
                    else
                    {
                            directionArrow = " ◀ ";
                    }
                    if(!model.isOneWay()){
                        directionArrow="";
                    }
                labelFeature.attributes.label=directionArrow + streetPart + " "+ speedPart +directionArrow;
                labelFeature.attributes.color=streetStyle[attributes.roadType]?streetStyle[attributes.roadType].strokeColor:"#f00";
                labelFeature.attributes.outlinecolor=streetStyle[attributes.roadType]?streetStyle[attributes.roadType].outlineColor:"#fff";
                labelFeature.attributes.angle=degrees;
                labelFeature.attributes.outlinewidth=labelOutlineWidth;
                labelFeature.attributes.fsize = labelFontSize;
                myFeatures.push(labelFeature);
            }
        }
    }
    return myFeatures;
}

function getSuperScript(number)
{
    if(number){
        if(W.prefs.attributes.isImperial)
        { //Convert the speed limit to mph
            number = Math.round(number / 1.609344);
        }
        var res="";
        number = number.toString();
        for(var i=0; i<number.length; ++i)
        {
          res += superScript[number.charAt(i)];
        }
        return res;
    }
    return "";
}

function drawNode(model)
{
    var point = new OpenLayers.Geometry.Point(model.attributes.geometry.x, model.attributes.geometry.y);
    var pointFeature = new OpenLayers.Feature.Vector(point, {myid:model.attributes.id}, nodeStyle);
    return pointFeature;
}

function drawAllSegments()
{
    streetVector.destroyFeatures();
    var segments = W.model.segments.objects;
    //consoleDebug(W.model.segments);
    if(Object.keys(segments).length == 0) return; // exit now if there are no segments to draw, otherwise remainder of function will bomb out
    var keysSorted = Object.keys(segments).sort(function(a,b){return segments[a].attributes.level-segments[b].attributes.level;});
    var myFeatures = [];
    for(var i=0, len = keysSorted.length; i<len; i++)
    {
        myFeatures.push.apply(myFeatures, drawSegment(segments[keysSorted[i]]));
    }
    streetVector.addFeatures(myFeatures);
}

function drawAllNodes()
{
    nodesVector.destroyFeatures();
        var nodeFeatures = [];
    var nodes = W.model.nodes.objects;
    //consoleDebug("nodes", nodes);
    for(var node in nodes)
    {
        if (nodes.hasOwnProperty(node)) {
            nodeFeatures.push(drawNode(nodes[node]));
        }
    }//End: For all the nodes
    nodesVector.addFeatures(nodeFeatures);
}

function doDraw()
{
    //consoleDebug("Drawing everything anew");
    drawAllSegments();

    if(!farZoom)
    {
        drawAllNodes();
    }
}

function addSegments(e)
{
    //consoleDebug("Segments added to model");
    e = e.filter(function(value){return value != undefined;})
    //consoleDebug(e);
    e.sort(function(a,b){return (a.attributes.level-b.attributes.level)});
    var myFeatures = [];
    for(var i=0; i<e.length; i++)
    {
        if(e[i] != null){
            var features = drawSegment(e[i]);
            for(var j=0; j<features.length; j++){
                //consoleDebug(j, features[j]);
                if( features[j] != undefined) //TODO find out what makes it undefined
                    myFeatures.push(features[j]);
            }
        }
    }
    streetVector.addFeatures(myFeatures);
}

function editSegments(e)
{
    //consoleDebug("Segments modifed", e);
    for(var i=0; i<e.length; i++)
    {
        if(typeof(e[i]._prevID) !== "undefined")
            removeSegmentById(parseInt(e[i]._prevID));
        removeSegmentById(e[i].attributes.id);
        if(e[i].state != "Delete")
            addSegments([e[i]]);
    }
    if(e.length>1 || e[0].state != null){
        if(!farZoom){
            setTimeout(drawAllNodes,50); //Without the timeout the last node remains in the model when rolling backs edit.
        }
    }
}

function removeSegmentById(id)
{
    //consoleDebug("RemoveById", id, typeof(id));
    streetVector.destroyFeatures(streetVector.getFeaturesByAttribute("myId", id));
}

function removeSegments(e){
    //consoleDebug("Segments removed from model");
    for(var i=0; i<e.length; i++)
    {
        removeSegmentById(e[i].attributes.id);
    }
}

function removeNodeById(id)
{
   nodesVector.destroyFeatures(nodesVector.getFeaturesByAttribute("myid", id));
}

function removeNodes(e)
{
    //consoleDebug("Remove nodes");
    for(var i=0; i<e.length; i++)
    {
        removeNodeById(e[i].attributes.id);
    }
    return true;
}

function addNodes(e)
{
    if(farZoom)
        return;
    //consoleDebug("Add nodes");
    var myFeatures = [];
    for(var i=0; i<e.length; i++)
    {
        myFeatures.push(drawNode(e[i]));
    }

    nodesVector.addFeatures(myFeatures);
    return true;
}

function bootstrapSVL() {
  // Check all requisites for the script
  if (typeof W === undefined ||
      typeof document.querySelector('#WazeMap') === undefined) {
    setTimeout(bootstrapSVL, 400);
    return;
  }
    /* begin running the code! */
    initSVL();
}

bootstrapSVL();

})();
