/* Miscellaneous JS functions which run after the page loads to rewrite or adjust parts of the page. */
/* author: Said Achmiz */
/* license: MIT (derivative of footnotes.js, which is PD) */

/***********/
/* HELPERS */
/***********/

/*  Run the given function immediately if the page is already loaded, or add
    a listener to run it as soon as the page loads.
    */
function doWhenPageLoaded(f) {
    if (document.readyState == "complete")
        f();
    else
        window.addEventListener("load", f);
}

/*=------------------=*/
/*= Tables & Figures =*/
/*=------------------=*/

/*  Expands all tables & figures whose wrapper block is marked with class
    "full-width" to span the viewport (minus a specified margin on both sides).
    */
function expandFullWidthBlocks() {
    document.querySelectorAll("img.full-width").forEach(fullWidthImage => {
        fullWidthImage.closest("figure").classList.add("full-width");
    });

    let fullWidthBlockMargin = "2.5ch";
    let pageWidth = document.querySelector("html").clientWidth;

    /*  Find all full-width blocks; set their position and size.
        */
    document.querySelectorAll(".tableWrapper.full-width, figure.full-width").forEach(fullWidthBlock => {
        fullWidthBlock.removeAttribute("style");
        fullWidthBlock.style.left = `calc(${(fullWidthBlock.getBoundingClientRect().left * -1) + "px"} + ${fullWidthBlockMargin})`;
        fullWidthBlock.style.width = `calc(${pageWidth + "px"} - (2 * ${fullWidthBlockMargin}))`;
    });

    /*  If sidenotes exist, update sidenote positions.
        */
    requestAnimationFrame(() => {
        if (typeof window.GW == "undefined" ||
            typeof GW.sidenotes == "undefined" ||
            GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == true ||
            GW.sidenotes.sidenoteDivs.length == 0)
            return;

            updateSidenotePositions();
    });
}

/*=-----------------=*/
/*= Figure captions =*/
/*=-----------------=*/

/*  Returns an array of objects each with two properties: 'media' (which
    is the image or video element) and 'caption' (which is the figcaption
    element). These are all the captioned media elements on the page.
    */
function getAllCaptionedMedia() {
    return Array.prototype.map.call(document.querySelectorAll("figure"), figure => {
        let media = figure.querySelector("img") || figure.querySelector("video");
        let caption = figure.querySelector("figcaption");
        return { media: media, caption: caption };
    }).filter(captionedMedia => captionedMedia.media && captionedMedia.caption);
}

/*  Sets minimum width of all captions to the width of their associated
    media (image or video) element.
    */
function setCaptionsMinimumWidth() {
    getAllCaptionedMedia().forEach(captionedMedia => {
        //  Get the caption wrapper span.
        let wrapper = captionedMedia.caption.closest(".caption-wrapper");
        //  Set wrapper minimum width to width of media element.
        wrapper.style.minWidth = captionedMedia.media.clientWidth + "px";
    });
}

/*=-------------=*/
/*= Code blocks =*/
/*=-------------=*/

/*  Rounds the height of all code blocks to the nearest integer (i.e., the
    nearest pixel), to fix a weird bug that cuts off the bottom border.
    */
function rectifyCodeBlockHeight(codeBlock) {
    codeBlock.style.height = parseInt(getComputedStyle(codeBlock).height) + "px";
}

/*********/
/* SETUP */
/*********/

/*  Wrap each table in a div.tableWrapper (for layout purposes).
    */
document.querySelectorAll("table").forEach(table => {
    if (table.parentElement.tagName == "DIV" && table.parentElement.children.length == 1)
        table.parentElement.classList.toggle("tableWrapper", true);
    else
        table.outerHTML = "<div class='tableWrapper'>" + table.outerHTML + "</div>";
});

/*  Expand full-width tables, and add a listener to recompute their size and
    position upon window resize.
    */
doWhenPageLoaded(expandFullWidthBlocks);
window.addEventListener("resize", expandFullWidthBlocks);

/*  Unwrap pre.sourceCode blocks from their extraneous containing divs.
    */
document.querySelectorAll("div.sourceCode").forEach(scd => {
    scd.outerHTML = scd.innerHTML;
});

/*  Rectify heights of all code blocks.
    */
doWhenPageLoaded(() => {
    document.querySelectorAll("pre code").forEach(codeBlock => {
        rectifyCodeBlockHeight(codeBlock);
    });
});

/*  Inject disclosure buttons and otherwise prepare the collapse blocks.
    */
document.querySelectorAll(".collapse").forEach(collapseBlock => {
    let disclosureButtonHTML = "<input type='checkbox' title='This is a collapsed region; mouse click to expand it. Collapsed text can be sections, code, text samples, or long digressions which most users will not read, and interested readers can opt into.' class='disclosure-button' aria-label='Open/close collapsed section'>";
    if (collapseBlock.tagName == "SECTION") {
        //  Inject the disclosure button.
        collapseBlock.children[0].insertAdjacentHTML("afterend", disclosureButtonHTML);
    } else if ([ "H1", "H2", "H3", "H4", "H5", "H6" ].contains(collapseBlock.tagName)) {
        // Remove the `collapse` class and do nothing else.
        collapseBlock.classList.remove("collapse");
    } else {
        //  Construct collapse block wrapper and inject the disclosure button.
        let realCollapseBlock = document.createElement("div");
        realCollapseBlock.classList.add("collapse");
        realCollapseBlock.insertAdjacentHTML("afterbegin", disclosureButtonHTML);
        //  Move block-to-be-collapsed into wrapper.
        collapseBlock.parentElement.insertBefore(realCollapseBlock, collapseBlock);
        collapseBlock.classList.remove("collapse");
        realCollapseBlock.appendChild(collapseBlock);
    }
});
/*  Add listeners to toggle 'expanded' class of collapse blocks.
    */
document.querySelectorAll(".disclosure-button").forEach(disclosureButton => {
    let collapseBlock = disclosureButton.closest(".collapse");
    disclosureButton.addEventListener("change", (event) => {
        collapseBlock.classList.toggle("expanded", disclosureButton.checked);

        //  If it's a code block, adjust its height.
        if (collapseBlock.lastElementChild.tagName == "PRE") {
            let codeBlock = collapseBlock.lastElementChild.lastElementChild;
            if (codeBlock.tagName != "CODE") return;

            codeBlock.style.height = "";
            requestAnimationFrame(() => {
                rectifyCodeBlockHeight(codeBlock);
            });
        }
    });
});

/*  Wrap all captions in figures in a span.
    */
getAllCaptionedMedia().forEach(captionedMedia => {
    //  Wrap the caption in the wrapper span.
    let wrapper = document.createElement("span");
    wrapper.classList.add("caption-wrapper");
    wrapper.appendChild(captionedMedia.caption);

    //  Re-insert the wrapped caption into the figure.
    let figure = captionedMedia.media.closest("figure");
    figure.appendChild(wrapper);

    // Tag the figure with the image's float class.
    if (captionedMedia.media.classList.contains("float-left"))
        captionedMedia.media.closest("figure").classList.add("float-left");
    if (captionedMedia.media.classList.contains("float-right"))
        captionedMedia.media.closest("figure").classList.add("float-right");
});

/*  Set minimum caption box width, and add listener to recalculate on
    window resize.
    */
doWhenPageLoaded(setCaptionsMinimumWidth);
window.addEventListener('resize', setCaptionsMinimumWidth);

/*  Insert zero-width spaces after problematic characters in links.
    (This is to mitigate justification/wrapping problems.)
    */
let problematicCharacters = '/';
document.querySelectorAll("p a, p a *").forEach(element => {
    element.childNodes.forEach(node => {
       if (node.childNodes.length > 0) return;
       node.textContent = node.textContent.replace(new RegExp("(\\w[" + problematicCharacters + "])(\\w)", 'g'), "$1\u{200B}$2");
    });
});

/*  Rectify straight quotes / apostrophes / etc. in the header and the page metadata.
    TODO: this should be doable in Hakyll at compile-time
    */
let textCleanRegexps = [
    // beginning "
    [/([^A-Za-z0-9_\)]|^)"(\S)/, '$1\u201c$2'],
    // ending "
    [/(\u201c[^"]*)"([^"]*$|[^\u201c"]*\u201c)/, '$1\u201d$2'],
    // remaining " at end of word
    [/([^0-9])"/, '$1\u201d'],
    // double quotes
    [/"(.+?)"/, '\u201c$1\u201d'],
    // beginning '
    [/(\W|^)'(\S)/, '$1\u2018$2'],
    // conjunction's possession
    [/([a-z])'([a-z])/, '$1\u2019$2'],
    // abbrev. years like '93
    [/(\u2018)([0-9]{2}[^\u2019]*)(\u2018([^0-9]|$)|$|\u2019[a-z])/, '\u2019$2$3'],
    // ending '
    [/((\u2018[^']*)|[a-z])'([^0-9]|$)/, '$1\u2019$3'],
    // backwards apostrophe
    [/(\B|^)\u2018(?=([^\u2018\u2019]*\u2019\b)*([^\u2018\u2019]*\B\W[\u2018\u2019]\b|[^\u2018\u2019]*$))/, '$1\u2019'],
];
document.querySelectorAll("header *, #page-metadata *").forEach(element => {
    element.childNodes.forEach(node => {
        if (node.childNodes.length > 0) return;
        textCleanRegexps.forEach(tcr => {
            node.textContent = node.textContent.replace(new RegExp(tcr[0], 'ig'), tcr[1]);
        });
    });
});

/*  Set the display form of margin notes (margin vs. inline).
 */
function updateMarginNoteStyle() {
    document.querySelectorAll(".marginnote").forEach(marginNote => {
        if (GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches) {
            marginNote.classList.add("inline");
            marginNote.classList.remove("sidenote");
        } else {
            marginNote.classList.remove("inline");
            marginNote.classList.add("sidenote");
        }
    });
}
doWhenPageLoaded (() => {
    updateMarginNoteStyle();
    GW.sidenotes.mediaQueries.viewportWidthBreakpoint.addListener(updateMarginNoteStyle);
});

/* What happens when a user C-fs on a page and there is a hit *inside* a collapse block? Just navigating to the collapsed section is not useful, especially when there may be multiple collapses inside a frame. So we must specially handle searches and pop open collapse sections with matches. Hooking keybindings like C-f is the usual approach, but that breaks on all the possible ways to invoke searches (different keys, bindings, browsers, toolbars, buttons etc). It's more reliable to check the 'blur'. */
/*  Reveals the given node by expanding all containing collapse blocks.
    */
function expandAllAncestorsOfNode(node) {
    // If the node is not an element (e.g. a text node), get its parent element.
    let element = node instanceof HTMLElement ? node : node.parentElement;

    // Get the closest containing collapse block. If none such, return.
    let enclosingCollapseBlock = element.closest(".collapse");
    if (!enclosingCollapseBlock) return;

    // Expand the collapse block by checking the disclosure-button checkbox.
    enclosingCollapseBlock.querySelector(`#${enclosingCollapseBlock.id} > .disclosure-button`).checked = true;

    // Recursively expand all ancestors of the collapse block.
    expandAllAncestorsOfNode(enclosingCollapseBlock.parentElement);
}

/*  When the window loses focus, add the selectionchange listener.
    (This will be triggered when a "find in page" UI is opened.)
    */
window.addEventListener("blur", () => {
    document.addEventListener("selectionchange", GW.selectionChangedWhenSearching = (event) => {
        expandAllAncestorsOfNode((document.getSelection()||{}).anchorNode);
    });
});

/*  When the window gains focus, remove the selectionchange listener.
    (This will be triggered when a "find in page" UI is closed.)
    */
window.addEventListener("focus", () => {
    document.removeEventListener("selectionchange", GW.selectionChangedWhenSearching);
});

/*! instant.page v5.1.0 - (C) 2019-2020 Alexandre Dieulot - https://instant.page/license */
/* Settings: 'prefetch' (loads HTML of target) after 800ms hover (desktop) or mouse-down-click (mobile); TODO: left in logging for testing during experiment */
let t,e;const n=new Set,o=document.createElement("link"),i=o.relList&&o.relList.supports&&o.relList.supports("prefetch")&&window.IntersectionObserver&&"isIntersecting"in IntersectionObserverEntry.prototype,s="instantAllowQueryString"in document.body.dataset,a=true,r="instantWhitelist"in document.body.dataset,c="instantMousedownShortcut"in document.body.dataset,d=1111;let l=800,u=!1,f=!1,m=!1;if("instantIntensity"in document.body.dataset){const t=document.body.dataset.instantIntensity;if("mousedown"==t.substr(0,"mousedown".length))u=!0,"mousedown-only"==t&&(f=!0);else if("viewport"==t.substr(0,"viewport".length))navigator.connection&&(navigator.connection.saveData||navigator.connection.effectiveType&&navigator.connection.effectiveType.includes("2g"))||("viewport"==t?document.documentElement.clientWidth*document.documentElement.clientHeight<45e4&&(m=!0):"viewport-all"==t&&(m=!0));else{const e=parseInt(t);isNaN(e)||(l=e)}}if(i){const n={capture:!0,passive:!0};if(f||document.addEventListener("touchstart",function(t){e=performance.now();const n=t.target.closest("a");if(!h(n))return;v(n.href)},n),u?c||document.addEventListener("mousedown",function(t){const e=t.target.closest("a");if(!h(e))return;v(e.href)},n):document.addEventListener("mouseover",function(n){if(performance.now()-e<d)return;const o=n.target.closest("a");if(!h(o))return;o.addEventListener("mouseout",p,{passive:!0}),t=setTimeout(()=>{v(o.href),t=void 0},l)},n),c&&document.addEventListener("mousedown",function(t){if(performance.now()-e<d)return;const n=t.target.closest("a");if(t.which>1||t.metaKey||t.ctrlKey)return;if(!n)return;n.addEventListener("click",function(t){1337!=t.detail&&t.preventDefault()},{capture:!0,passive:!1,once:!0});const o=new MouseEvent("click",{view:window,bubbles:!0,cancelable:!1,detail:1337});n.dispatchEvent(o)},n),m){let t;(t=window.requestIdleCallback?t=>{requestIdleCallback(t,{timeout:1500})}:t=>{t()})(()=>{const t=new IntersectionObserver(e=>{e.forEach(e=>{if(e.isIntersecting){const n=e.target;t.unobserve(n),v(n.href)}})});document.querySelectorAll("a").forEach(e=>{h(e)&&t.observe(e)})})}}function p(e){e.relatedTarget&&e.target.closest("a")==e.relatedTarget.closest("a")||t&&(clearTimeout(t),t=void 0)}function h(t){if(t&&t.href&&(!r||"instant"in t.dataset)&&(a||t.origin==location.origin||"instant"in t.dataset)&&["http:","https:"].includes(t.protocol)&&("http:"!=t.protocol||"https:"!=location.protocol)&&(s||!t.search||"instant"in t.dataset)&&!(t.hash&&t.pathname+t.search==location.pathname+location.search||"noInstant"in t.dataset))return!0}function v(t){if(n.has(t))return;const e=document.createElement("link");console.log("Prefetched: "+t);e.rel="prefetch",e.href=t,document.head.appendChild(e),n.add(t)};

/* Directional navigation links on self-links: for each self-link like "see [later](#later-section)", find the linked section, whether it's before or after, and if it is before/previously, annotate the self-link with '↑' and if after/later, '↓'. This helps the reader know if it's a backwards link to a section already read, or an unread section. */
document.body.querySelectorAll("#markdownBody :not(h1):not(h2):not(h3):not(h4):not(h5):not(h6) > a[href^='#']:not(.footnote-ref):not(.footnote-back):not(.sidenote-self-link):not(.sidenote-back):not(.sidenote)").forEach(sectionLink => {
    header = document.body.querySelector("#markdownBody section[id='" + sectionLink.hash.substring(1) + "']");
    if (!header) return;
    sectionLink.classList.add((sectionLink.compareDocumentPosition(header) == Node.DOCUMENT_POSITION_FOLLOWING) ? 'section-link-down' : 'section-link-up');
})
