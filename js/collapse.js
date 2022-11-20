/*******************************/
/*	Events fired by collapse.js:

	Collapse.collapseStateDidChange {
			source: "Collapse.collapseBlockDisclosureButtonStateChanged"
		}
		Fired when collapse state (i.e., the collapsed/expanded state of a 
		collapse block) changes in response to a collapse block’s disclosure
		button being activated.

	Collapse.collapseStateDidChange {
			source: "expandCollapseBlocksToReveal"
		}
		Fired when collapse state (i.e., the collapsed/expanded state of a 
		collapse block) changes (specifically: changes to the expanded state) in
		response to a navigation action that takes the user to an element that 
		was within a collapsed block.

	Collapse.collapseStateDidChange {
			source: "prepareCollapseBlocks"
		}
		Fired at load time if a collapse block starts out expanded, due to it,
		or some element within it, being pointed to by the URL hash. (The state
		change is from the default state, i.e. collapsed, to the expanded state
		specified by the hash.)

	Collapse.targetDidRevealOnHashUpdate
		Fired when an element targeted by the URL hash is revealed (i.e., 
		scrolled to, causing it to end up within the viewport) as a result of
		a hash change (which may include the initial page load).
 */

/*******************************************************************************/
/*  This function expands all collapse blocks containing the given node, if
    any (including the node itself, if it is a collapse block). Returns true
    if any such expansion occurred. Fires Collapse.collapseStateDidChange event
    after all (possibly recursive) expansion is completed. (Only one event fired
    per non-recursive call to expandCollapseBlocksToReveal(), even if recursive
    expansion occurred.)
 */
//	Called by: expandCollapseBlocksToReveal (recursively)
//	Called by: revealElement
//	Called by: GW.selectionChanged (event listener)
function expandCollapseBlocksToReveal(node) {
    GWLog("expandCollapseBlocksToReveal", "collapse.js", 2);

	if (!node)
		return;

    // If the node is not an element (e.g. a text node), get its parent element.
    let element = node instanceof HTMLElement ? node : node.parentElement;

    /*  If the given element is not within any collapsed block, there is nothing
        to do.
     */
    if (!isWithinCollapsedBlock(element))
    	return false;

    //  Expand the nearest collapse block.
    let collapseParent = element.closest(".collapse");
    let disclosureButton = collapseParent.querySelector(".disclosure-button");
    let expansionOccurred = (disclosureButton.checked == false);
    disclosureButton.checked = true;
    collapseParent.classList.toggle("expanded", disclosureButton.checked);

    /*  Expand any higher-level collapse blocks!
        Fire state change event only if we did NOT have to do any further
        expansion (otherwise we’ll do redundant layout).
     */
    if (!expandCollapseBlocksToReveal(collapseParent.parentElement) && expansionOccurred)
    	GW.notificationCenter.fireEvent("Collapse.collapseStateDidChange", { source: "expandCollapseBlocksToReveal" });

    //  Report whether we had to expand a collapse block.
    return expansionOccurred;
}

/*******************************************************************/
/*  Returns true if the given collapse block is currently collapsed.
 */
//	Called by: isWithinCollapsedBlock
function isCollapsed(collapseBlock) {
    return !collapseBlock.classList.contains("expanded");
}

/*****************************************************************************/
/*  Returns true if the given element is within a currently-collapsed collapse
    block.
 */
//	Called by: isWithinCollapsedBlock (recursively)
//	Called by: expandCollapseBlocksToReveal
//	Called by: sidenotes.js
//	Called by: transclude.js
function isWithinCollapsedBlock(element) {
    /*  If the element is not within a collapse block at all, it obviously can't
        be within a *currently-collapsed* collapse block.
     */
    let collapseParent = element.closest(".collapse");
    if (!collapseParent)
    	return false;

    /*  If the element is within a collapse block and that collapse block is
        currently collapsed, then the condition is satisfied...
     */
    if (isCollapsed(collapseParent))
    	return true;

    /*  BUT the collapse block that the element is in, even if *it* is not
        itself collapsed, could be *within* another collapse block!
     */
    return isWithinCollapsedBlock(collapseParent.parentElement);
}

/***********************************************************************/
/*  Inject disclosure buttons and otherwise prepare the collapse blocks.
 */
function prepareCollapseBlocks(loadEventInfo) {
	GWLog("prepareCollapseBlocks", "collapse.js", 1);

	let aBlockDidStartExpanded = false;

	//  Construct all collapse blocks (in correct final state).
	loadEventInfo.document.querySelectorAll(".collapse").forEach(collapseBlock => {
		let checked = collapseBlock.contains(getHashTargetedElement()) ? " checked='checked'" : "";
		let disclosureButtonHTML = `<input type='checkbox' class='disclosure-button' aria-label='Open/close collapsed section'${checked}>`;

		if (checked > "")
			aBlockDidStartExpanded = true;

		if (collapseBlock.tagName == "SECTION") {
			//  Inject the disclosure button.
			collapseBlock.firstElementChild.insertAdjacentHTML("afterend", disclosureButtonHTML);
			if (checked > "")
				collapseBlock.classList.add("expanded");
		} else if ([ "H1", "H2", "H3", "H4", "H5", "H6" ].includes(collapseBlock.tagName)) {
			//  Remove the ‘collapse’ class and do nothing else.
			collapseBlock.classList.remove("collapse");
			if (collapseBlock.className == "")
				collapseBlock.removeAttribute("class");
		} else if (   collapseBlock.parentElement.tagName == "DIV" 
				   && collapseBlock.parentElement.children.length == 1) {
			//  Use parent div as collapse block wrapper.
			let realCollapseBlock = collapseBlock.parentElement;
			realCollapseBlock.classList.add("collapse");

			//	Inject the disclosure button.
			realCollapseBlock.insertAdjacentHTML("afterbegin", disclosureButtonHTML);
			if (checked > "")
				realCollapseBlock.classList.add("expanded");

			//  Remove the ‘collapse’ class.
			collapseBlock.classList.remove("collapse");
			if (collapseBlock.className == "")
				collapseBlock.removeAttribute("class");
		} else {
			//  Construct collapse block wrapper and inject the disclosure button.
			let realCollapseBlock = newElement("DIV", { "class": `collapse${(checked > "" ? " expanded" : "")}` });
			realCollapseBlock.insertAdjacentHTML("afterbegin", disclosureButtonHTML);

			//  Move block-to-be-collapsed into wrapper.
			collapseBlock.parentElement.insertBefore(realCollapseBlock, collapseBlock);
			realCollapseBlock.appendChild(collapseBlock);

			//  Remove the ‘collapse’ class.
			collapseBlock.classList.remove("collapse");
			if (collapseBlock.className == "")
				collapseBlock.removeAttribute("class");
		}
	});

	if (aBlockDidStartExpanded)
		GW.notificationCenter.fireEvent("Collapse.collapseStateDidChange", { source: "prepareCollapseBlocks" });
}

addContentLoadHandler(prepareCollapseBlocks, ">rewrite", (info) => (   info.needsRewrite 
																	&& info.collapseAllowed));

/*************************************************/
/*  Add event listeners to the disclosure buttons.
 */
function activateCollapseBlockDisclosureButtons(loadEventInfo) {
	GWLog("activateCollapseBlockDisclosureButtons", "collapse.js", 1);

    //  Add listeners to toggle ‘expanded’ class of collapse blocks.
	loadEventInfo.document.querySelectorAll(".disclosure-button").forEach(disclosureButton => {
		let collapseBlock = disclosureButton.closest(".collapse");
		if (disclosureButton.stateChangedHandler)
			return;

		disclosureButton.addEventListener("change", disclosureButton.stateChangedHandler = (event) => {
			GWLog("Collapse.collapseBlockDisclosureButtonStateChanged", "collapse.js", 2);

			collapseBlock.classList.toggle("expanded", disclosureButton.checked);

			//	Correct for CSS transition aberration.
			if (!disclosureButton.checked) {
				disclosureButton.style.transition = "none";
				setTimeout(() => {
					disclosureButton.style.transition = "";
				}, 100);
			}

			//	“Scroll into view” in main document vs. pop-frames.
			let scrollCollapseBlockIntoView = (collapseBlock) => {
				if (collapseBlock.closest(".popframe-body"))
					Extracts.popFrameProvider.scrollElementIntoViewInPopFrame(collapseBlock);
				else
					scrollElementIntoView(collapseBlock);
			};

			/*	If a collapse block was collapsed from the bottom, it might now
				be up off the screen. Scroll it into view.
			 */
			if (   !disclosureButton.checked 
				&& !isOnScreen(collapseBlock))
				scrollCollapseBlockIntoView(collapseBlock);
			/*	If a collapse block was expanded from the bottom, the top of the
				collapse block might be up off the screen. Scroll it into view.
			 */
			else if (   disclosureButton.checked 
					 && collapseBlock.getBoundingClientRect().top < 0)
				scrollCollapseBlockIntoView(collapseBlock);

	    	GW.notificationCenter.fireEvent("Collapse.collapseStateDidChange", { source: "Collapse.collapseBlockDisclosureButtonStateChanged" });
		});

		/*	Collapse block expand-on-hover. Clicking within the block while it
			is temporarily expanded causes it to stay expanded permanently.
		 */
		let expandOnHoverDelay = 750;
		onEventAfterDelayDo(disclosureButton, "mouseenter", expandOnHoverDelay, (event) => {
			if (disclosureButton.checked)
				return;

			disclosureButton.checked = true;
			disclosureButton.stateChangedHandler(event);
			disclosureButton.classList.add("expanded-temp");

			let collapseBlockMouseleaveHandler = (event) => {
				disclosureButton.checked = false;
				disclosureButton.stateChangedHandler(event);
				disclosureButton.classList.remove("expanded-temp");

				collapseBlock.removeEventListener("mouseleave", collapseBlockMouseleaveHandler);
			};
			let collapseBlockClickHandler = (event) => {
				disclosureButton.classList.remove("expanded-temp");

				collapseBlock.removeEventListener("mouseleave", collapseBlockMouseleaveHandler);
				collapseBlock.removeEventListener("click", collapseBlockClickHandler);
			};
			collapseBlock.addEventListener("mouseleave", collapseBlockMouseleaveHandler);
			collapseBlock.addEventListener("click", collapseBlockClickHandler);
		}, "mouseleave");
	});
}

addContentLoadHandler(activateCollapseBlockDisclosureButtons, "eventListeners", (info) => info.collapseAllowed);

/**********************************************************/
/*	Removes disclosure buttons and expands collapse blocks.
 */
function expandLockCollapseBlocks(loadEventInfo) {
	GWLog("expandLockCollapseBlocks", "collapse.js", 2);

	//  Remove disclosure buttons.
	loadEventInfo.document.querySelectorAll(".disclosure-button").forEach(disclosureButton => {
		disclosureButton.remove();
	});

	//  Permanently expand collapse blocks (by making them into regular blocks).
	loadEventInfo.document.querySelectorAll(".collapse").forEach(collapseBlock => {
		let wasCollapsed = !collapseBlock.classList.contains("expanded");

		collapseBlock.classList.remove("collapse", "expanded");
		if (collapseBlock.className == "")
			collapseBlock.removeAttribute("class");
		if (   collapseBlock.firstElementChild.tagName == "DIV"
			&& collapseBlock.firstElementChild.className == ""
			&& isOnlyChild(collapseBlock.firstElementChild)) {
			unwrap(collapseBlock.firstElementChild);
		} else if (   collapseBlock.tagName == "DIV"
				   && collapseBlock.className == ""
				   && isOnlyChild(collapseBlock.firstElementChild)) {
			unwrap(collapseBlock);
		}

		if (wasCollapsed)
	    	GW.notificationCenter.fireEvent("Collapse.collapseStateDidChange", { source: "Collapse.expandLockCollapseBlocks" });

	});
}

addContentLoadHandler(expandLockCollapseBlocks, ">rewrite", (info) => !info.collapseAllowed);

/*******************************************************************************/
/*	Ensure that the given element is scrolled into view when layout is complete.
 */
//	Called by: revealElement
//	Called by: prepareCollapseBlocks
//	Called by: sidenotes.js
function scrollElementIntoView(element, offset = 0) {
    GWLog("scrollElementIntoView", "collapse.js", 2);

	doWhenPageLayoutComplete(() => {
		element.scrollIntoView();
		if (offset != 0)
			window.scrollBy(0, offset);
	});
}

/*******************************************************************************/
/*	Expand collapse blocks to reveal the given element, and scroll it into view.
 */
//	Called by: revealTarget
//	Called by: sidenotes.js
function revealElement(element, scrollIntoView = true) {
    GWLog("revealElement", "collapse.js", 2);

	let didExpandCollapseBlocks = expandCollapseBlocksToReveal(element);

	if (scrollIntoView)
		scrollElementIntoView(element);

	return didExpandCollapseBlocks;
}

/********************************************************/
/*  Return the element targeted by the URL hash, or null.
 */
//	Called by: revealTarget
//	Called by: prepareCollapseBlocks
//	Called by: sidenotes.js
function getHashTargetedElement() {
	return (location.hash.length > 1
		    ? document.querySelector(selectorFromHash(location.hash))
		    : null);
}

/***********************************************/
/*  Reveal the element targeted by the URL hash.
 */
//	Called by: GW.hashUpdated (event handler)
function revealTarget() {
    GWLog("revealTarget", "collapse.js", 1);

    let target = getHashTargetedElement();
    if (!target)
    	return;

	let didReveal = revealElement(target);

	//	Fire notification event.
	if (didReveal)
		GW.notificationCenter.fireEvent("Collapse.targetDidReveal");
}

GW.notificationCenter.addHandlerForEvent("GW.hashHandlingSetupDidComplete", GW.revealTargetOnPageLayoutComplete = (info) => {
    GWLog("GW.revealTargetOnPageLayoutComplete", "collapse.js", 1);

	revealTarget();

	GW.notificationCenter.addHandlerForEvent("GW.hashDidChange", GW.revealTargetOnHashChange = (info) => {
 		GWLog("GW.revealTargetOnHashChange", "collapse.js", 1);

		revealTarget();
	});
});

/*******************************************************************************/
/*	What happens when a user C-fs on a page and there is a hit *inside* a 
	collapse block? Just navigating to the collapsed section is not useful, 
	especially when there may be multiple collapses inside a frame. So we must 
	specially handle searches and pop open collapse sections with matches. We do 
	this by watching for selection changes. (We don’t bother checking for window
	focus/blur because that is unreliable and in any case doesn’t work for 
	“Search Again” key command.)
 */
document.addEventListener("selectionchange", GW.selectionChanged = (event) => {
	GWLog("GW.selectionChangedCheckForCollapsedContainer", "collapse.js", 3);

	let newSelection = document.getSelection();
	if (   newSelection 
		&& newSelection.rangeCount > 0
		&& newSelection.getRangeAt(0).toString().length > 0)
		expandCollapseBlocksToReveal(newSelection.anchorNode);
});
