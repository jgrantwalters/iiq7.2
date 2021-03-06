/* (c) Copyright 2008 SailPoint Technologies, Inc., All Rights Reserved. */

/**
 * This class contains the logic used by the numberOfBandsInclude.xhtml page to maintain 
 * the band table
 * 
 * NOTE: After upgrading Tomahawk libraries, the tomahawk dataList has a bug with the ForceIdIndexFormula
 * For some strange reason, instead of generating formname:idindexevaluation it is truncating the last letter
 * of the form name and not including the :. A bug has been opened with Apache:
 * https://issues.apache.org/jira/browse/TOMAHAWK-1663
 * Once this is fixed, we can revert this revision. -rap
 */
var maxBands = 6;
var bands;
var labels;
var currentNumBands;
var colors = [''];
var imageFormat = '.png';

// determines which colors to use based on the number of bands
var colorList  = [
    ['low', 'high'],
    ['low', 'medium', 'high'],
    ['low', 'medium_low', 'medium_high', 'high'],
    ['low', 'medium_low', 'medium', 'medium_high', 'high'],
    ['lowest', 'low', 'medium_low', 'medium_high', 'high', 'highest']
];

var textColorList  = [
    ['#FFFFFF', '#FFFFFF'],
    ['#FFFFFF', '#000000', '#FFFFFF'],
    ['#FFFFFF', '#000000', '#000000', '#FFFFFF'],
    ['#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF'],
    ['#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#FFFFFF']
];

// likewise for labels
var labelsList = [
    ["#{msgs.risk_band_low}", "#{msgs.risk_band_high}"],
    ["#{msgs.risk_band_low}", "#{msgs.risk_band_med}", "#{msgs.risk_band_high}"],
    ["#{msgs.risk_band_low}", "#{msgs.risk_band_med_low}", "#{msgs.risk_band_med_high}", "#{msgs.risk_band_high}"],
    ["#{msgs.risk_band_low}", "#{msgs.risk_band_med_low}", "#{msgs.risk_band_med}", "#{msgs.risk_band_med_high}", "#{msgs.risk_band_high}"],
    ["#{msgs.risk_band_lowest}", "#{msgs.risk_band_low}", "#{msgs.risk_band_med_low}", "#{msgs.risk_band_med_high}", "#{msgs.risk_band_high}", "#{msgs.risk_band_highest}"],
    ["#{msgs.risk_band_lowest}", "#{msgs.risk_band_low}", "#{msgs.risk_band_med_low}", "#{msgs.risk_band_med}", "#{msgs.risk_band_med_high}", "#{msgs.risk_band_high}", "#{msgs.risk_band_highest}"]
];

// This variable keeps track of which band was last chosen as the last band.
var cachedLastDiv = {};

// Initializes an editable table if forEditing is true; initializes a static on otherwise
function initBandTable(forEditing, bandJson) {
    cachedLastDiv.index = -1;
    cachedLastDiv.innerHTML = '';

    currentNumBands = Ext.getDom('editForm:numBands').value;
    if (currentNumBands > maxBands)
        currentNumBands = maxBands;

    bands = colorList[currentNumBands - 2];
    labels = labelsList[currentNumBands - 2];
    textColors = textColorList[currentNumBands - 2];

    displayBands(forEditing,bandJson);
}

// Displays an editable table if forEditing is true.  Displays a static table otherwise
function displayBands(forEditing,bandJson) {
    var howManyBands = bands.length;
    var maxScore = Ext.getDom('editForm:maxScore').value;

    // Restore cached info if necessary
    if (cachedLastDiv.index > -1) {
        Ext.getDom('bandRange' + cachedLastDiv.index).innerHTML = cachedLastDiv.innerHTML;
    } 

    var rows = Ext.getDom('editForm:bandConfigTable').rows;
    for (var i = 0; i < howManyBands; ++i) {
        rows[i+1].style['display'] = '';
        if(null == bandJson || bandJson.colorBands[i].label == '') {
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandLabel').value = labels[i];
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandColor').value = bands[i];
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandTextColor').value = textColors[i];
            // strip off the pound sign from the front of the color when building the image url
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandIndicator').src = SailPoint.Risk.convertColorToImage(bands[i]);
        }
        else {
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandLabel').value = bandJson.colorBands[i].label;
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandColor').value = bands[i];
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandTextColor').value = bandJson.colorBands[i].textColor;
            // strip off the pound sign from the front of the color when building the image url
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandIndicator').src = SailPoint.Risk.convertColorToImage(bands[i]);
        }

        if (forEditing) {
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandlower').innerHTML = (i == 0 ? 0 : Ext.getDom('editForm:bandConfigTabl' + (i - 1) + ':bandupper').value * 1 + 1);
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandupper').style['display'] = '';
        }
    }

    Ext.getDom('errorMessage').style['display'] = 'none';

    var lastBand = howManyBands - 1;

    if (forEditing) {
        Ext.getDom('editForm:bandConfigTabl' + lastBand + ':bandlower').innerHTML = Ext.getDom('editForm:bandConfigTabl' + (lastBand - 1) + ':bandupper').value * 1.0 + 1;
        // We don't want to make the upper bound configurable
        Ext.getDom('editForm:bandConfigTabl' + lastBand + ':bandupper').value = maxScore;
        Ext.getDom('editForm:bandConfigTabl' + lastBand + ':bandupper').style['display'] = 'none';
        Ext.getDom('editForm:bandConfigTabl' + lastBand + ':bandupper').parentNode.insertBefore(Ext.getDom('maxScore'), null);
    }

    for (var i = howManyBands; i < maxBands; ++i) {
        // Hide the unused rows and clear out their fields
        rows[i+1].style['display'] = 'none';

        if (forEditing) {
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandlower').value = '';
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandupper').value = '';
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandLabel').value = '';
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandColor').value = '';
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandTextColor').value = '';
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandupper').style['display'] = 'none';
            // the blank gif prevents an extraneous browser callback, looking for graphics
            Ext.getDom('editForm:bandConfigTabl' + i + ':bandIndicator').src = SailPoint.getRelativeUrl('/images/blank.gif');
        }
    }
    //Force the container's layout to be recalculated
    Ext.getCmp('identitySettingsTabPan').doLayout();
}

// This function takes the index of a band that has just been updated
// and adjusts the band that follows it to conform to two requirements:
// 1. The next band's lower bound must match the updated band's upper bound
// 2. The next band's new lower bound must not be greater than its upper
//    bound.  If it is, the change needs to be backed out and an error message
//    needs to be displayed.
function adjustNextBand(bandIndex, keyupEvent) {
    // Force IE to react to enter being pressed
    if (keyupEvent && keyupEvent.keyCode != 13) {
        return false;
    }

    var nextBandIndex = bandIndex + 1;
    var previousBandIndex = bandIndex - 1;

    // round the input to whole numbers and reset the form field values
    var newUpper = Math.round(Ext.getDom('editForm:bandConfigTabl' + bandIndex + ':bandupper').value);
    var nextUpper = Math.round(Ext.getDom('editForm:bandConfigTabl' + nextBandIndex + ':bandupper').value);

    Ext.getDom('editForm:bandConfigTabl' + bandIndex + ':bandupper').value = newUpper;
    Ext.getDom('editForm:bandConfigTabl' + nextBandIndex + ':bandupper').value = nextUpper;

    // Validate the adjusted value before making any changes
    var previousUpper;    
    if (previousBandIndex == -1) {
        previousUpper = 0;
    } else {
        previousUpper = Ext.getDom('editForm:bandConfigTabl' + previousBandIndex + ':bandupper').value * 1.0;
    } 

    if (!isNumber(newUpper) || nextUpper <= newUpper || previousUpper >= newUpper) {
        // Back out the change
        Ext.getDom('editForm:bandConfigTabl' + bandIndex + ':bandupper').value = Ext.getDom('editForm:bandConfigTabl' + nextBandIndex + ':bandlower').innerHTML * 1.0 - 1;
        // Ext.getDom('bandDisplay' + bandIndex).style['border-width'] = '1';
        Ext.getDom('errorMessage').style['visibility'] = 'visible';

        if (!isNumber(newUpper)) {
            Ext.getDom('errorMessage').innerHTML = 'The last change was not made because the new bound was not a valid number.';
        } else {
            Ext.getDom('errorMessage').innerHTML = 'The last change was not made because the new bound matched or exceeded the next band\'s upper bound.';
        }

        return false;
    } else {
        // Only take action if a real change was made -- don't take action if we're restoring the value from a backup
        if (!(Ext.getDom('editForm:bandConfigTabl' + bandIndex + ':bandupper').value == Ext.getDom('editForm:bandConfigTabl' + nextBandIndex + ':bandlower').innerHTML * 1.0 - 1)) {
            Ext.getDom('errorMessage').style['visibility'] = 'hidden';
            Ext.getDom('editForm:bandConfigTabl' + nextBandIndex + ':bandlower').innerHTML = Ext.getDom('editForm:bandConfigTabl' + bandIndex + ':bandupper').value * 1.0 + 1;
        }
 
        return false;
    }
}
  
function updateBands(keyupEvent) {
    // Force IE to react to enter being pressed
    if (keyupEvent && keyupEvent.keyCode != 13) {
        return false;
    }

    var updatedNumBands = Ext.getDom('editForm:numBands').value;
    if (!isNumber(updatedNumBands) || updatedNumBands < 2 || updatedNumBands > maxBands) {
        Ext.getDom('editForm:numBands').value = currentNumBands;
    } else {
        redistributeBounds(Ext.getDom('editForm:numBands').value);
        displayBands(true,null);
    }
}

function redistributeBounds(numberOfBands) {
    if (numberOfBands > maxBands) {
        return;
    }

    bands = colorList[numberOfBands - 2];
    labels = labelsList[numberOfBands - 2];

    var maxScore = Ext.getDom('editForm:maxScore').value;
    var bandWidth = maxScore / numberOfBands;
    var currentLower = 0;
    var currentUpper = bandWidth;
    var midpoint = Math.floor(numberOfBands / 2);

    for (var i = 0; i < numberOfBands; ++i) {
        Ext.getDom('editForm:bandConfigTabl' + i + ':bandlower').value = Math.round(currentLower);
        Ext.getDom('editForm:bandConfigTabl' + i + ':bandupper').value = Math.round(currentUpper);
        currentLower = currentUpper + 1;
        currentUpper += bandWidth;
    }
}

function addColor(index, color) {
    colors[index] = color;
}

function getColorForScore(score) {
    var i = 0;

    while (Ext.getDom('editForm:bandConfigTabl' + i + ':bandupper').innerHTML * 1.0 < score) {
        ++i;
    }

    return Ext.getDom('editForm:bandConfigTabl' + i + ':bandColor').value.replace('#', '');
}
Ext.ns('SailPoint', 'SailPoint.Risk');

SailPoint.Risk.convertColorToImage = function(color) {
    var imageBase = SailPoint.getRelativeUrl('/images/icons/risk_indicator_');
    return imageBase + color + imageFormat;
};
