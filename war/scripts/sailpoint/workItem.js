/* (c) Copyright 2008 SailPoint Technologies, Inc., All Rights Reserved. */

Ext.ns('SailPoint', 'SailPoint.WorkItemEditor');

SailPoint.initWorkItemEditor = function() {
    SailPoint.WorkItemEditor.initEditableDates();
};

SailPoint.WorkItemEditor.initEditableDates = function() {
    var dateFields = Ext.DomQuery.select('div[class=dateField]');
    var i;
    var dateField;
    var dateInputs;
    var dateInput;
    var dateTimeInput;

    for (i = 0; i < dateFields.length; ++i) {
        dateField = dateFields[i];

        dateInputs = Ext.DomQuery.select('input', dateField);
        dateInput = dateInputs[0];

        dateTimeInput = new SailPoint.DateTimeInput({
            inputEl : dateInput,
            renderTo : dateField.id
        });

        // var form = Ext.get(dateField).parent('form', true);
        // Ext.EventManager.on(form, 'submit', SailPoint.WorkItemDateValidator,
        // dateTimeInput);
    }
};

// Took this from attributeEditor.js, should be able to share

SailPoint.WorkItemDateValidator = function(eventObj, formElement, options) {
    var dateTimeInput = this;
    var row = dateTimeInput.getEl().parent('tr');
    var errorDiv = row.child('div[class=formError]');

    if (dateTimeInput.isValid()) {
        errorDiv.setStyle('display', 'none');
    } else {
        errorDiv.setStyle('display', '');
        eventObj.preventDefault();
    }
};

/**
 * Open the dialog to add a comment to a work item.
 * 
 * @param btnName The ID of the button to click to save the comment.
 * @param btnText The text to display on the button used to save the comment.
 * @param title The title of the dialog to display.
 * @param hideDialog True to hide dialog after OK button press (for AJAX posts)
 */
function addComment(btnName, btnText, title, checkCompletion, hideDialog) {
    
    if (checkCompletion === undefined) {
        checkCompletion = true;
    }

    // if not a cert work item, SailPoint.Decider will not be referenced
    // so we can skip the check here for unsaved warning
    if (SailPoint.Decider) {
        var msg = SailPoint.Decider.getInstance().warnUnsaved();
        if (msg) {
            // there are unsaved changes
            var x = window.confirm(msg);

            if (x) {
                SailPoint.Decider.getInstance().removeAll();
            } else {
                return false;
            }
        }
    }

    // Check for completion..
    if (checkCompletion && Ext.getDom('editForm:workItemComplete')) {
        var workItemComplete = (Ext.getDom('editForm:workItemComplete').value == 'true');
        var requiresCompletion = (Ext.getDom('editForm:requiresCompletion').value == 'true');
        var workItemType = Ext.getDom('editForm:workItemType').value;

        var remediationCount = 0;
        if (Ext.getDom('editForm:remediationCount'))
            remediationCount = Ext.getDom('editForm:remediationCount').value;

        // there's a special convenience case involving a single remediation
        // item which should be treated as complete
        if ((workItemType == 'Remediation') && (remediationCount == 1))
            workItemComplete = true;

        if (!workItemComplete) {
            if (requiresCompletion) {
                var message = '#{msgs.err_delegation_not_complete}';
                if (workItemType == 'Remediation')
                    message = '#{msgs.err_remediation_not_complete}';

                alert(message);
                return false;
            } else if (workItemType == 'Delegation') {
                if (!window.confirm('#{msgs.warn_work_item_not_complete}')) {
                    return false;
                }
            }
        }
    }

    SailPoint.showAddCommentDlg(function(buttonId, text) {
        if(buttonId === 'ok') {
            Ext.getDom('editForm:newComment').value = text;
            Ext.getDom(btnName).click();
            showProgress();
        }
    });
}

function showProgress() {
    Ext.MessageBox.show({
        msg: '#{msgs.workitem_updating}',
        progressText: '#{msgs.workitem_updating}',
        width:300,
        wait:true,
        waitConfig: {interval:500}
    });
}

/**
 * Open the dialog to add a comment to a remediation item.
 * 
 * @param id The ID of the remediation item.
 * @param btnName The ID of the button to click to save the comment.
 * @param btnText The text to display on the button used to save the comment.
 * @param title The title of the dialog to display.
 */
function addRemediationItemComment(id, btnName, btnText, title) {
    var params = {
        remediationItemId : id
    };
    
    // prevent the okay button from being clicked multiple times.
    var clicked = false;

    var windowUrl = CONTEXT_PATH + "/workitem/remediationItemCommentPanel.jsf?" + Ext.Object.toQueryString(params);

    SailPoint.confirm( {
        url : windowUrl,
        options : {
            method : 'get'
        }
    }, {
        windowParameters : {
            className : 'sailpoint',
            title : title
        },
        okLabel : btnText,
        cancelLabel : "#{msgs.button_cancel}",
        ok : function(win) {
            // Make sure the user can't double click the ok button.
            if (!clicked) {
                clicked = true;
                Ext.getDom(btnName).click();
                return false;
            }
        },
        cancel : function(win) {
            SailPoint.NavigationHistory.back();
            Ext.getDom('editForm:id').value = workItemId;
            return true;
        },
        callback : function() {
            Ext.getDom('editForm:id').value = id;
        },
        buttonAlign : 'center'
    } );
}


/**
 * Verifies that the given workItemId is that of an active work item.
 * There have been cases of two people remediating the same work item
 * more or less simultaneously, which creates esoteric problems for 
 * the second person who tries to remediate.
 * 
 * @param workItemId
 * @param selModel
 */
function prevalidateBulkComplete(workItemId, selModel) {
    Ext.Ajax.request({
        url : SailPoint.getRelativeUrl('/workitem/prevalidate.json'),
        params : {
            'WorkItemId' : workItemId
        },
        success : function(response) {
            switch (response.responseText.trim()) {
                case ("active"):
                    bulkCompleteRemediationItems(workItemId, selModel);
                
                    break;
                case ("archived"):
                    Ext.MessageBox.show({
                        title : '#{msgs.work_item_complete}',
                        msg : '#{workitem_completed}',
                        buttons : Ext.Msg.OK,
                        icon : Ext.MessageBox.INFO,
                        callback: function() { SailPoint.NavigationHistory.home(); }
                    });
    
                    break;
                case ("unknown"):
                default:
                    Ext.MessageBox.show({
                        title : '#{msgs.err_dialog_title}',
                        msg : 'There was an error processing the request.',
                        buttons : Ext.Msg.OK,
                        icon : Ext.MessageBox.ERROR
                    });
    
                    break;
            }
        },
        failure : function() {
            alert('Unable to prevalidate work item: ' + workItemId);
        },
        scope : this
    });
}


/**
 * Open the dialog to complete multiple remediation items.
 * 
 * @param workItemId The ID of the work item that owns the remediations.
 * @param vCheckbox The VirtualCheckbox with the selection state.
 */
function bulkCompleteRemediationItems(workItemId, selModel) {

    //SelModel sucks so badly.  If select everything was ever used, getSelectedIds is all ids regardless
    //if the user de-selected some ids, in which case getExcludedIds contains the un-selected ids.  Apparently
    //the selModel sucks at maintaning a single array - which leaves us to do that stupid brainless work.
    var selModelSelectedIds = selModel.getSelectedIds();
    var excludedIds = selModel.getExcludedIds();
    var selectedIds = arrayToString(selModelSelectedIds, false);
                                                          
    var btnName = (selModel.isAllSelected() && selModel.getExcludedIds().length == 0) ? 'editForm:completeAllRemediationItemsBtn'
            : 'editForm:completeSelectedRemediationItemsBtn';
            
    if((selModel.isAllSelected() && selModel.getExcludedIds().length > 0)) {
        selModelSelectedIds = Ext.Array.difference(selModelSelectedIds, excludedIds);
        selectedIds = arrayToString(selModelSelectedIds, false);
    }
    
    var params = {
        workItemId : workItemId,
        selectedRemediationItemIds : selectedIds
    };

    var windowUrl = CONTEXT_PATH + "/workitem/bulkRemediationItemCommentPanel.jsf?" + Ext.Object.toQueryString(params);

    SailPoint.confirm({
            url : windowUrl,
            options : {
                method : 'get'
            }
        }, 
        {
            windowParameters : {
                className : 'sailpoint',
                title : '#{msgs.dialog_title_complete_remed_items}'
            },
            okLabel : "#{msgs.button_save_comment}",
            cancelLabel : "#{msgs.button_cancel}",
            ok : function(win) {
                Ext.getDom(btnName).click();
                return false;
            },
            cancel : function(win) {
                SailPoint.NavigationHistory.back();
            }
    });
}

/**
 * Open a dialog to forward the work item for the logged in user for the given
 * certification.
 * 
 * @param certificationId The ID of the certification to forward.
 * @param nextPage The next page to go to after forwarding.
 * @param limitReassignments Whether to limit the amount of
 *  reassignments or forwards that can occur
 */
function forwardCertificationWorkItem(certificationId, nextPage, limitReassignments) {
    if (limitReassignments === true || limitReassignments === "true") {
        Ext.MessageBox.show({
            title: '#{msgs.err_dialog_title}',
            msg: '#{msgs.err_reassignment_limit_exceeded}',
            buttons: Ext.MessageBox.OK,
            icon: Ext.MessageBox.ERROR
        });
        return;
    }
    forwardWorkItem(null, certificationId, nextPage);
}

function forwardWorkItem(workItemId, certificationId, nextPage, useNavHistory, priority) {

    var windowTitle = '#{msgs.dialog_title_forward_work_item}';

    var params = {};
    if (!SailPoint.Utils.isNullOrEmpty(workItemId)) {
        params['workItemForwardPanelForm:id'] = workItemId;
    }

    if (!SailPoint.Utils.isNullOrEmpty(certificationId)) {
        windowTitle = '#{msgs.dialog_title_forward_certification}';
        params['certificationToForward'] = certificationId;
    }

    if (!SailPoint.Utils.isNullOrEmpty(nextPage)) {
        params['workItemFwdNextPage'] = nextPage;
    }

    var contentUrl = CONTEXT_PATH + "/workitem/workItemForwardPanel.jsf?" + Ext.Object.toQueryString(params);

    // If they request to use nav history, specify a cancel function to go back.
    var cancelFunc = null;
    if (useNavHistory) {
        var objectId = (null !== workItemId) ? workItemId : certificationId;
        cancelFunc = SailPoint.NavigationHistory.getCancelFunction(objectId);
    } else {
        cancelFunc = function(win) {
            win.hide();
        };
    }

    SailPoint.confirm({
                        url : contentUrl,
                        options : {
                            method : 'post'
                        }
                    },
                    {
                        windowParameters : {
                            className : 'SailPoint',
                            title : windowTitle,
                            width : 500
                        },
                        cancelLabel : '#{msgs.button_cancel}',
                        cancel : cancelFunc,
                        okLabel : '#{msgs.button_forward}',
                        id : 'workItemForwardPanel',
                        callback : function() {
                            var ownerNameSuggest = new SailPoint.IdentitySuggest(
                                    {
                                        id : 'ownerNameSuggestBox',
                                        renderTo : 'ownerNameSuggest',
                                        binding : 'workItemForwardPanelForm:ownerName',
                                        rawValue : Ext.getDom('workItemNewOwnerDisplayableName').innerHTML,
                                        width : 300,
                                        baseParams : {
                                            context : 'Owner'
                                        }
                                    });

                            /** Make the button disabled so you can't click it * */
                            Ext.getDom("workItemForwardPanelForm:hiddenForwardBtn").disabled = true;

                            var suggestBox = Ext.getCmp('ownerNameSuggestBox');
                            suggestBox.on('specialkey', function(suggest, event) {
                                                if (Ext.EventObject.RETURN === event.keyCode) {
                                                    Validator.hideErrors(Ext.getDom('workItemError'));
                                                    /* IIQETN-4553 :: Keeping a copy of the value from the hidden Tomahawk field bound to the
                                                    owners suggest field before the 'select' event takes place */
                                                    var ownerHolder = Ext.get('workItemForwardPanelForm:ownerName');
                                                    if (ownerHolder) {
                                                        var value = ownerHolder.getValue();
                                                    }
                                                    /* IIQETN-4553 :: Deferring the enter key handling to allow the 'select' event to take place
                                                     * and make sure that we submit the right value in the right time, otherwise the
                                                     * 'select' event takes place later and we could submit the last selected value instead.
                                                     */
                                                    Ext.Function.defer(function(){
                                                        // IIQETN-4553 :: Taking a hold of the value that was just selected
                                                        var updatedValue = Ext.get('workItemForwardPanelForm:ownerName').getValue();
                                                        /* IIQETN-4553 :: Need to make sure that this is an enter to submit and not to select a
                                                         * value from the suggest picker or that it was an enter in an empty suggest so that we
                                                         * can validate and notify the user that he needs to select an identity before submitting.
                                                         */
                                                        if (value && updatedValue && value === updatedValue || (value === "" && updatedValue === "")) {
                                                            event.preventDefault();
                                                            var button = Ext.DomQuery.select('button', Ext.getDom('spConfirmPanelOkButton'))[0];
                                                            button.click();
                                                        } else {
                                                            /* IIQETN-4553 :: Returning the focus to the suggest after the 'select'
                                                            * event so that they can hit enter and submit if no comments are to be made
                                                            * without having to click the suggest again or click the button.
                                                            */
                                                            this.focus(0, 10);
                                                            return;
                                                        }
                                                    }, 100, this, [value]);
                                                }
                            });
                            suggestBox.focus(0, 1000);

                            Ext.getDom('workItemForwardPanelForm:priority').value = priority;
                            
                            //set window height to account for sizing of components
                            var h = Ext.get('workItemForwardPanelForm').getHeight() + 95;
                            SailPoint.Dialog.setHeight(h);
                        },
                        ok : function(win) {
                            var isValid = true;
                            var elt = Ext.get('workItemForwardPanelForm:ownerName');
                            if (null !== elt) {
                                var ownerName = elt.dom.value;
                                isValid = Validator.validateNonBlankString(ownerName, '#{msgs.err_req_recipient}');
                            } else {
                                isValid = false;
                            }

                            if (isValid) {
                                Ext.get("workItemForwardPanelForm:hiddenForwardBtn").dom.disabled = false;
                                Ext.getDom('workItemForwardPanelForm:hiddenForwardBtn').click();
                            } else {
                                Validator.displayErrors(Ext.get('workItemError'));
                            }
                            return false;
                        }
                    });
}

/**
 * Open a dialog that views the details of a remediation item.
 * 
 * @param id The ID of the RemediationItem to view.
 */
function viewRemediationItem(id, isReadOnly, isComplete) {

    var params = {
        remediationItemId : id
    };

    var windowUrl = CONTEXT_PATH + "/workitem/viewRemediationItem.jsf?" + Ext.Object.toQueryString(params);


    SailPoint.confirm({
            url : windowUrl,
            options : {
                method : 'post'
            }
        }, 
        {
            windowParameters : {
                className : 'sailpoint',
                title : '#{msgs.dialog_title_remediate}',
                width : 768
            },
            okLabel : (isReadOnly || isComplete) ? "#{msgs.button_ok}" : "#{msgs.button_complete}",
            cancelLabel : "#{msgs.button_cancel}",
            ok : function(win) {
                if (!isReadOnly && !isComplete) {
                    addRemediationItemComment(id,
                            'editForm:completeRemediationItemBtn',
                            "#{msgs.button_title_add_comment}",
                            '#{msgs.dialog_title_complete_remediation}');
                } else {
                    SailPoint.NavigationHistory.back();
                    win.close();
                }
                return false;
            },
            cancel : function(win) {
                SailPoint.NavigationHistory.back();
            }
    });
}

// Bug 2123 - This was supposed to have been defined in a Dialog,
// but IE doesn't seem to execute it on the fly. We're pre-defining
// it here as a precaution
function clearFormHiddenParams_workItemForwardPanelForm(curFormName) {
    var curForm = document.forms[curFormName];
}

SailPoint.getWorkItemPriority = function() {
    var prioritySelection = Ext.get('editForm:prioritySelection');
    if (prioritySelection) {
        return prioritySelection.value;
    }

    return null;
};

// jsl - don't do these right away, the one we have is initially hidden
// and it doesn't render properly (only half is shown, either the date
// picker or the time picker, instead we'll call initEditableDates
// in the inculding JSF file
// Ext.onReady(SailPoint.initWorkItemEditor);
