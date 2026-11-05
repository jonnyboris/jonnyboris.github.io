var editor = document.getElementById("editor"),
    tabList = document.getElementById("tabs"),
    saveError = document.getElementById("save-error"),
    menuButton = document.getElementById("menu-button"),
    menuPanel = document.getElementById("menu-panel"),
    storageKey = "editor-tabs",
    closedTabLimit = 20,
    canSave = true,
    state = load(),
    debouncedSave = _.debounce(save, 1000);

function defaultTabName() {
    var now = new Date();
    function pad(value) {
        return String(value).padStart(2, "0");
    }
    return pad(now.getFullYear() % 100) + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
        " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
}

function newTab(content) {
    var name = defaultTabName();
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: name,
        defaultName: name,
        hasCustomName: false,
        content: content
    };
}

function showError(message) {
    saveError.textContent = message;
    saveError.hidden = false;
}

function isValidTab(tab) {
    return tab && typeof tab.id === "string" && typeof tab.name === "string" && typeof tab.content === "string";
}

function load() {
    var content = "";
    try {
        var saved = localStorage.getItem(storageKey);
        if (saved !== null) {
            var loaded = JSON.parse(saved);
            if (!loaded || !Array.isArray(loaded.tabs) || !loaded.tabs.length || !loaded.tabs.every(isValidTab)) {
                throw new Error("Invalid saved tabs");
            }
            if (loaded.closedTabs === undefined) loaded.closedTabs = [];
            if (!Array.isArray(loaded.closedTabs) || !loaded.closedTabs.every(isValidTab)) {
                throw new Error("Invalid closed tabs");
            }
            loaded.closedTabs = loaded.closedTabs.slice(0, closedTabLimit);
            loaded.tabs.concat(loaded.closedTabs).forEach(function(tab) {
                // Older saves only distinguished default names by their date format.
                var dateName = /^\d{2}-\d{2}-\d{2} \d{2}:\d{2}$/.test(tab.name);
                if (typeof tab.hasCustomName !== "boolean") tab.hasCustomName = !dateName;
                if (typeof tab.defaultName !== "string") tab.defaultName = dateName ? tab.name : defaultTabName();
            });
            if (!loaded.tabs.some(function(tab) { return tab.id === loaded.activeTabId; })) {
                loaded.activeTabId = loaded.tabs[0].id;
            }
            return loaded;
        }
        // Carry the original single note into the first tab, leaving its old storage entry intact.
        content = localStorage.getItem("content");
        if (content === null) {
            content = "This is a simple text editor, it automatically saves your text, locally to your computer. So if you close the tab it should still be here when you get back. ";
        }
    } catch (error) {
        canSave = false;
        showError("Saved notes could not be loaded. Saving is paused to protect them; try reloading the page.");
    }
    var tab = newTab(content);
    return { tabs: [tab], activeTabId: tab.id, closedTabs: [] };
}

function activeTab() {
    return state.tabs.find(function(tab) { return tab.id === state.activeTabId; });
}

function captureContent() {
    activeTab().content = editor.innerHTML;
}

function updateTabLabel(tab) {
    var name = document.getElementById("tab-" + tab.id);
    name.textContent = tab.name;
    name.title = tab.name + " — Double-click or press F2 to rename";
    name.parentElement.querySelector(".tab-close").setAttribute("aria-label", "Close " + tab.name);
}

function updateAutomaticTitle() {
    var tab = activeTab();
    if (tab.hasCustomName) return;
    var name = editor.innerText.trim().split(/\s+/, 2).join(" ") || tab.defaultName;
    if (tab.name === name) return;
    tab.name = name;
    updateTabLabel(tab);
}

function save() {
    captureContent();
    if (!canSave) return;
    try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        saveError.hidden = true;
    } catch (error) {
        showError("Your latest changes could not be saved. Browser storage may be full or unavailable; keep this page open and copy your notes.");
    }
}

function renderTabs() {
    tabList.replaceChildren();
    state.tabs.forEach(function(tab) {
        var selected = tab.id === state.activeTabId;
        var item = document.createElement("div");
        item.className = "tab" + (selected ? " active" : "");
        item.setAttribute("role", "presentation");
        item.addEventListener("mousedown", function(event) {
            if (event.button === 1) event.preventDefault();
        });
        item.addEventListener("auxclick", function(event) {
            if (event.button !== 1) return;
            event.preventDefault();
            var renaming = tabList.querySelector(".tab-rename");
            if (renaming) renaming.blur();
            closeTab(tab.id);
            // Keep Linux middle-click paste away from the note.
            document.getElementById("tab-" + state.activeTabId).focus();
        });

        var name = document.createElement("button");
        name.type = "button";
        name.className = "tab-name";
        name.id = "tab-" + tab.id;
        name.textContent = tab.name;
        name.title = tab.name + " — Double-click or press F2 to rename";
        name.setAttribute("role", "tab");
        name.setAttribute("aria-selected", String(selected));
        name.setAttribute("aria-controls", "note-panel");
        name.tabIndex = selected ? 0 : -1;
        name.addEventListener("click", function() { selectTab(tab.id); });
        name.addEventListener("dblclick", function() { renameTab(tab); });
        name.addEventListener("keydown", function(event) {
            if (event.key === "F2") {
                event.preventDefault();
                renameTab(tab);
            } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                var index = state.tabs.indexOf(tab);
                if (event.key === "Home") index = 0;
                else if (event.key === "End") index = state.tabs.length - 1;
                else index = (index + (event.key === "ArrowRight" ? 1 : -1) + state.tabs.length) % state.tabs.length;
                selectTab(state.tabs[index].id);
                document.getElementById("tab-" + state.activeTabId).focus();
            }
        });

        var close = document.createElement("button");
        close.type = "button";
        close.className = "tab-close";
        close.textContent = "×";
        close.title = "Close tab";
        close.setAttribute("aria-label", "Close " + tab.name);
        close.addEventListener("click", function() { closeTab(tab.id); });

        item.append(name, close);
        tabList.appendChild(item);
    });
    updateSelection();
}

function updateSelection() {
    tabList.querySelectorAll(".tab-name").forEach(function(name) {
        var selected = name.id === "tab-" + state.activeTabId;
        name.setAttribute("aria-selected", String(selected));
        name.tabIndex = selected ? 0 : -1;
        name.parentElement.classList.toggle("active", selected);
    });
    document.getElementById("note-panel").setAttribute("aria-labelledby", "tab-" + state.activeTabId);
    document.getElementById("tab-" + state.activeTabId).parentElement.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function selectTab(id) {
    if (id === state.activeTabId) return;
    captureContent();
    state.activeTabId = id;
    editor.innerHTML = activeTab().content;
    updateSelection();
    save();
}

function renameTab(tab) {
    var name = document.getElementById("tab-" + tab.id);
    var input = document.createElement("input");
    input.type = "text";
    input.className = "tab-rename";
    input.value = tab.name;
    input.setAttribute("aria-label", "Tab name");
    input.style.width = name.getBoundingClientRect().width + "px";
    name.style.visibility = "hidden";
    name.after(input);

    input.addEventListener("input", function() {
        // Size the label while typing so clicking away cannot move the clicked tab.
        name.textContent = input.value.trim() || tab.name;
        input.style.width = name.getBoundingClientRect().width + "px";
        name.parentElement.scrollIntoView({ block: "nearest", inline: "nearest" });
    });

    var finished = false;
    function finish(commit, restoreFocus) {
        if (finished) return;
        finished = true;
        if (commit && input.value.trim()) {
            tab.name = input.value.trim();
            tab.hasCustomName = true;
            updateTabLabel(tab);
            save();
        }
        input.remove();
        name.textContent = tab.name;
        name.style.visibility = "";
        if (restoreFocus) name.focus();
    }

    input.addEventListener("blur", function() { finish(true, false); });
    input.addEventListener("keydown", function(event) {
        if (event.isComposing) return;
        if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            finish(event.key === "Enter", true);
        }
    });
    input.focus();
    input.select();
}

function closeTab(id) {
    captureContent();
    var index = state.tabs.findIndex(function(tab) { return tab.id === id; });
    state.closedTabs.unshift(state.tabs.splice(index, 1)[0]);
    state.closedTabs = state.closedTabs.slice(0, closedTabLimit);
    if (!state.tabs.length) state.tabs.push(newTab(""));
    if (state.activeTabId === id) {
        state.activeTabId = state.tabs[Math.min(index, state.tabs.length - 1)].id;
        editor.innerHTML = activeTab().content;
    }
    renderTabs();
    save();
    editor.focus();
}

function setMenuOpen(open) {
    menuPanel.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    if (!open) return;

    var list = document.getElementById("closed-tabs");
    list.replaceChildren();
    document.getElementById("no-closed-tabs").hidden = state.closedTabs.length > 0;
    state.closedTabs.forEach(function(tab) {
        var item = document.createElement("li");
        var restore = document.createElement("button");
        restore.type = "button";
        restore.className = "restore-tab";
        restore.textContent = tab.name;
        restore.title = "Restore " + tab.name;
        restore.addEventListener("click", function() { restoreTab(tab.id); });
        item.appendChild(restore);
        list.appendChild(item);
    });
    var first = list.querySelector("button");
    if (first) first.focus();
}

function restoreTab(id) {
    var index = state.closedTabs.findIndex(function(tab) { return tab.id === id; });
    if (index === -1) return;
    captureContent();
    var tab = state.closedTabs.splice(index, 1)[0];
    state.tabs.push(tab);
    state.activeTabId = tab.id;
    editor.innerHTML = tab.content;
    renderTabs();
    setMenuOpen(false);
    save();
    editor.focus();
}

menuButton.addEventListener("click", function() { setMenuOpen(menuPanel.hidden); });
document.addEventListener("click", function(event) {
    if (!menuButton.contains(event.target) && !menuPanel.contains(event.target)) setMenuOpen(false);
});
document.addEventListener("focusin", function(event) {
    if (!menuButton.contains(event.target) && !menuPanel.contains(event.target)) setMenuOpen(false);
});
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && !menuPanel.hidden) {
        event.preventDefault();
        setMenuOpen(false);
        menuButton.focus();
    }
});

document.getElementById("add-tab").addEventListener("click", function() {
    captureContent();
    var tab = newTab("");
    state.tabs.push(tab);
    state.activeTabId = tab.id;
    editor.innerHTML = tab.content;
    renderTabs();
    save();
    editor.focus();
});

editor.addEventListener("input", function() {
    captureContent();
    updateAutomaticTitle();
    debouncedSave();
});
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "hidden") save();
});

editor.innerHTML = activeTab().content;
renderTabs();
save();
editor.focus();
