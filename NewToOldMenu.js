(function() {
    let keydownHandler = null;
    
    // UI Styles
    const menuStyle = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; border: 2px solid #333; border-radius: 10px; padding: 20px; z-index: 10000; box-shadow: 0 0 20px rgba(0,0,0,0.3); text-align: center; max-height: 85vh; width: 300px; display: flex; flex-direction: column;';
    const buttonStyle = 'display: block; width: calc(100% - 20px); margin: 10px auto; padding: 10px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;';
    
    // Data dictionary for all the "Old" item types
    const oldTypes = {
        'Adult Biography': { circType: '1', prefix: 'Biography - ', physicalLocation: '156' },
        'Adult Fiction': { circType: '1', prefix: 'Fiction - ', physicalLocation: '157' },
        'Adult Graphic Novel': { circType: '1', prefix: 'Adult Graphic Novel - ', physicalLocation: '104' },
        'Adult Non-Fiction': { circType: '1', prefix: 'Non-Fiction - ', physicalLocation: '136' },
        'DVD Documentary': { circType: '119', prefix: 'Documentary - ', physicalLocation: '163' },
        'DVD Movie': { circType: '104', prefix: 'DVD - ', physicalLocation: '102' },
        'Large Print Fiction': { circType: '1', prefix: 'Large Print - ', physicalLocation: '131' },
        'LFH': { circType: '1', prefix: 'Local Family History - ', physicalLocation: '130' },
        'Middle Grade (J) Biography': { circType: '111', prefix: 'Biography - ', physicalLocation: '156' },
        'Middle Grade (J) Fiction': { circType: '111', prefix: 'Middle Grade Fiction - ', physicalLocation: '127' },
        'Middle Grade (J) Graphic Novel': { circType: '111', prefix: 'Middle Grade Graphic Novel - ', physicalLocation: '129' },
        'Middle Grade (J) Non-Fiction': { circType: '111', prefix: 'Youth Non-Fiction - ', physicalLocation: '122' },
        'Young Adult Biography': { circType: '1', prefix: 'Biography - ', physicalLocation: '156' },
        'Young Adult Fiction': { circType: '1', prefix: 'Young Adult Fiction - ', physicalLocation: '154' },
        'Young Adult Graphic Novel': { circType: '1', prefix: 'Young Adult Graphic Novel - ', physicalLocation: '155' },
        'Young Adult Non-Fiction': { circType: '1', prefix: 'Non-Fiction - ', physicalLocation: '136' },
        'Youth (E) Non-Fiction': { circType: '111', prefix: 'Youth Non-Fiction - ', physicalLocation: '122' }
    };

    const mgFictionGenres = [
        { name: 'Adventure', prefix: 'Middle Grade - Adventure - ' },
        { name: 'Animals', prefix: 'Middle Grade - Animals - ' },
        { name: 'Classics', prefix: 'Middle Grade - Classics - ' },
        { name: 'Entertainment', prefix: 'Middle Grade - Entertainment - ' },
        { name: 'Fantasy', prefix: 'Middle Grade - Fantasy - ' },
        { name: 'Historical', prefix: 'Middle Grade - Historical - ' },
        { name: 'Mystery', prefix: 'Middle Grade - Mystery - ' },
        { name: 'Novels In Verse', prefix: 'Middle Grade - Novels In Verse - ' },
        { name: 'Realistic', prefix: 'Middle Grade - Realistic - ' },
        { name: 'Scary', prefix: 'Middle Grade - Scary - ' },
        { name: 'Sci-Fi', prefix: 'Middle Grade - Sci-Fi - ' },
        { name: 'Sports', prefix: 'Middle Grade - Sports - ' }
    ];

    function closeMenus() {
        const menus = document.querySelectorAll('div[style*="position: fixed"][style*="z-index: 10000"]');
        menus.forEach(menu => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        });
        if (keydownHandler) {
            document.removeEventListener('keydown', keydownHandler);
            keydownHandler = null;
        }
    }

    function setFields(settings) {
        // Field IDs specifically mapped from the "New to Old" batch update screens
        const circTypeCheckbox = document.getElementById('ChangeCircType');
        const physicalLocationCheckbox = document.getElementById('ChangeSublocation');
        const otherFieldCheckbox = document.getElementById('ChangeOtherField');
        
        const otherFieldSelect = document.getElementById('OtherField');
        const circTypeSelect = document.getElementById('CircTypeCode');
        const physicalLocationSelect = document.getElementById('SublocationCode');
        const otherFieldValue = document.getElementById('ValueOtherField');

        if (circTypeSelect && otherFieldSelect && physicalLocationSelect) {
            // Check the checkboxes
            if (circTypeCheckbox) circTypeCheckbox.checked = true;
            if (otherFieldCheckbox) otherFieldCheckbox.checked = true;
            if (physicalLocationCheckbox) physicalLocationCheckbox.checked = true;

            // Set the drop-downs and text fields
            otherFieldSelect.value = 'CallNumberPrefix';
            circTypeSelect.value = settings.circType;
            otherFieldValue.value = settings.prefix;
            physicalLocationSelect.value = settings.physicalLocation;

            closeMenus();
            console.log("Library fields have been automatically set.");
        } else {
            alert("This webpage does not include the necessary fields! Aborting task.");
            closeMenus();
        }
    }

    function createSubMenuMiddleGradeFiction() {
        const baseSettings = oldTypes['Middle Grade (J) Fiction'];
        const items = mgFictionGenres.map(genre => ({
            name: genre.name,
            action: () => setFields({ circType: baseSettings.circType, prefix: genre.prefix, physicalLocation: baseSettings.physicalLocation })
        }));
        createFilterableMenu('Select Middle Grade Genre', items);
    }

    function createFilterableMenu(titleText, items) {
        closeMenus();
        
        const menu = document.createElement('div');
        menu.style.cssText = menuStyle;
        
        const title = document.createElement('h2');
        title.textContent = titleText;
        menu.appendChild(title);
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Type to filter...';
        searchInput.style.cssText = 'width: 100%; box-sizing: border-box; margin-bottom: 15px; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;';
        menu.appendChild(searchInput);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'overflow-y: auto; flex-grow: 1;';
        menu.appendChild(buttonContainer);
        
        let selectedIndex = -1;
        const highlightColor = '#0b3d91';
        const normalColor = '#4CAF50';
        const highlightOutline = '3px solid #FFD700';

        function updateHighlight() {
            const visibleButtons = Array.from(buttonContainer.querySelectorAll('button:not([style*="display: none"])'));
            visibleButtons.forEach((btn, index) => {
                if (index === selectedIndex) {
                    btn.style.backgroundColor = highlightColor;
                    btn.style.outline = highlightOutline;
                    btn.style.outlineOffset = '-3px';
                    btn.style.fontWeight = 'bold';
                    btn.scrollIntoView({ block: 'nearest' });
                } else {
                    btn.style.backgroundColor = normalColor;
                    btn.style.outline = 'none';
                    btn.style.outlineOffset = '0';
                    btn.style.fontWeight = 'normal';
                }
            });
        }
        
        items.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.name;
            button.style.cssText = buttonStyle;
            button.onclick = item.action;
            buttonContainer.appendChild(button);
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = buttonStyle;
        cancelButton.style.backgroundColor = '#f44336';
        cancelButton.style.marginTop = '15px';
        cancelButton.onclick = closeMenus;
        menu.appendChild(cancelButton);
        
        document.body.appendChild(menu);
        searchInput.focus();
        
        searchInput.addEventListener('input', () => {
            const filterValue = searchInput.value.toLowerCase().trim();
            const tokens = filterValue.length === 0 ? [] : filterValue.split(/\s+/);
            const buttons = buttonContainer.querySelectorAll('button');
            buttons.forEach(btn => {
                const btnText = btn.textContent.toLowerCase();
                const words = btnText.split(/\W+/).filter(w => w.length > 0);
                const isMatch = tokens.length === 0 || tokens.every(token => words.some(word => word.startsWith(token)));
                btn.style.display = isMatch ? 'block' : 'none';
                btn.style.backgroundColor = normalColor;
                btn.style.outline = 'none';
                btn.style.outlineOffset = '0';
                btn.style.fontWeight = 'normal';
            });
            selectedIndex = -1;
        });
        
        keydownHandler = function(event) {
            const visibleButtons = Array.from(buttonContainer.querySelectorAll('button:not([style*="display: none"])'));
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenus();
            } else if (visibleButtons.length > 0) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (selectedIndex !== -1 && visibleButtons[selectedIndex]) {
                        visibleButtons[selectedIndex].click();
                    } else {
                        visibleButtons[0].click();
                    }
                } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    selectedIndex++;
                    if (selectedIndex >= visibleButtons.length) selectedIndex = 0;
                    updateHighlight();
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    selectedIndex--;
                    if (selectedIndex < 0) selectedIndex = visibleButtons.length - 1;
                    updateHighlight();
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
    }

    // Launch the menu immediately upon clicking the bookmarklet
    let menuItems = [];
    Object.keys(oldTypes).forEach(typeName => {
        if (typeName === 'Middle Grade (J) Fiction') {
            menuItems.push({
                name: typeName,
                action: createSubMenuMiddleGradeFiction
            });
        } else {
            menuItems.push({
                name: typeName,
                action: () => setFields(oldTypes[typeName])
            });
        }
    });
    
    // Sort alphabetically
    menuItems.sort((a, b) => a.name.localeCompare(b.name));
    
    createFilterableMenu('Update Item to "Old"', menuItems);
})();