const PANEL_ORDER = ['jobSetup', 'ragSetup', 'settings', 'info'];
const PANEL_TITLES = {
    jobSetup: 'Job Setup',
    ragSetup: 'RAG Setup',
    settings: 'Settings',
    info: 'Info',
};
const PANEL_ICONS = {
    jobSetup: 'fa-bolt',
    ragSetup: 'fa-database',
    settings: 'fa-gears',
    info: 'fa-circle-info',
};

/**
 * Builds the single docked, edge-anchored sliding panel shown when the
 * Shardwright trigger is opened. Replaces the former radial wheel + popover
 * layout: one panel, one internal tab row, no anchor-relative positioning.
 */
export function createFabPanels({ edge, panelMarkupById, onAction, onPanelRendered }) {
    const root = document.createElement('div');
    root.className = 'shardwright-fab-panels';
    root.dataset.edge = edge;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Shardwright quick actions');
    root.setAttribute('aria-hidden', 'true');

    const tabRow = document.createElement('div');
    tabRow.className = 'shardwright-fab-tab-row';
    tabRow.setAttribute('role', 'tablist');

    const scroll = document.createElement('div');
    scroll.className = 'shardwright-fab-panel-scroll';

    const tabButtons = new Map();
    const panelElements = new Map();
    let activePanelId = PANEL_ORDER[0];

    PANEL_ORDER.forEach((panelId) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'shardwright-fab-tab';
        tab.dataset.panelId = panelId;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-label', `${PANEL_TITLES[panelId]} panel`);
        tab.title = PANEL_TITLES[panelId];
        tab.innerHTML = `<i class="fa-solid ${PANEL_ICONS[panelId]}" aria-hidden="true"></i><span>${PANEL_TITLES[panelId]}</span>`;
        tabRow.appendChild(tab);
        tabButtons.set(panelId, tab);

        const panel = document.createElement('section');
        panel.className = 'shardwright-fab-panel-body-wrap';
        panel.dataset.panelId = panelId;
        panel.setAttribute('role', 'tabpanel');
        panel.innerHTML = buildPanelShell(panelMarkupById[panelId]);
        scroll.appendChild(panel);
        panelElements.set(panelId, panel);
        onPanelRendered?.(panelId, panel);
    });

    root.appendChild(tabRow);
    root.appendChild(scroll);
    document.body.appendChild(root);

    syncActiveState();

    const onClick = (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (actionButton) {
            const action = actionButton.dataset.action;
            if (action) onAction?.(action, actionButton);
            return;
        }

        const tab = event.target.closest('.shardwright-fab-tab');
        if (tab?.dataset.panelId) {
            setActivePanel(tab.dataset.panelId);
        }
    };
    root.addEventListener('click', onClick);

    const onKeydown = (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const focusedTab = document.activeElement?.closest?.('.shardwright-fab-tab');
        if (!focusedTab) return;

        event.preventDefault();
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const currentIndex = Math.max(0, PANEL_ORDER.indexOf(focusedTab.dataset.panelId));
        const nextId = PANEL_ORDER[(currentIndex + step + PANEL_ORDER.length) % PANEL_ORDER.length];
        setActivePanel(nextId);
        tabButtons.get(nextId)?.focus();
    };
    root.addEventListener('keydown', onKeydown);

    function setActivePanel(panelId) {
        if (!panelElements.has(panelId)) return;
        activePanelId = panelId;
        syncActiveState();
    }

    function syncActiveState() {
        tabButtons.forEach((tab, panelId) => {
            const isActive = panelId === activePanelId;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panelElements.forEach((panel, panelId) => {
            panel.classList.toggle('is-active', panelId === activePanelId);
        });
    }

    return {
        root,
        setEdge(nextEdge) {
            root.dataset.edge = nextEdge;
        },
        setPosition({ top, edgeInset } = {}) {
            if (Number.isFinite(top)) {
                root.style.setProperty('top', `${top}px`, 'important');
            }
            if (Number.isFinite(edgeInset)) {
                const dockEdge = root.dataset.edge;
                if (dockEdge === 'right') {
                    root.style.setProperty('right', `${edgeInset}px`, 'important');
                    root.style.removeProperty('left');
                } else if (dockEdge === 'left') {
                    root.style.setProperty('left', `${edgeInset}px`, 'important');
                    root.style.removeProperty('right');
                }
            }
        },
        open() {
            root.classList.add('is-open');
            root.setAttribute('aria-hidden', 'false');
        },
        close() {
            root.classList.remove('is-open');
            root.setAttribute('aria-hidden', 'true');
        },
        updatePanel(panelId, panelMarkup) {
            const panel = panelElements.get(panelId);
            if (!panel) return;
            panel.innerHTML = buildPanelShell(panelMarkup);
            onPanelRendered?.(panelId, panel);
        },
        containsTarget(target) {
            return root.contains(target);
        },
        getActivePanelId() {
            return activePanelId;
        },
        focusInitial() {
            tabButtons.get(activePanelId)?.focus();
        },
        destroy() {
            root.removeEventListener('click', onClick);
            root.removeEventListener('keydown', onKeydown);
            root.remove();
        },
    };
}

function buildPanelShell(innerMarkup) {
    return `<div class="shardwright-fab-panel-body">${innerMarkup}</div>`;
}
