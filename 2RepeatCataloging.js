(function() { 
    function setFields(settings, isPictureBook = false) { 
        const circTypeSelect = document.getElementById('EffectiveCircTypeCode'); 
        const reportClassSelect = document.getElementById('ReportClassCode'); 
        const callNumberPrefixInput = document.getElementById('CallNumberPrefix'); 
        const physicalLocationSelect = document.getElementById('SublocationCode'); 
        let missingIds = []; 
        
        if (!circTypeSelect) missingIds.push('EffectiveCircTypeCode'); 
        if (!reportClassSelect && settings.reportClass !== '') missingIds.push('ReportClassCode'); 
        if (!callNumberPrefixInput) missingIds.push('CallNumberPrefix'); 
        if (!physicalLocationSelect) missingIds.push('SublocationCode'); 
        
        if (missingIds.length === 0) { 
            circTypeSelect.value = settings.circType; 
            if (settings.reportClass !== '') { 
                reportClassSelect.value = settings.reportClass; 
            } else if(reportClassSelect) { 
                reportClassSelect.value = ''; 
            } 
            callNumberPrefixInput.value = settings.callNumberPrefix; 
            physicalLocationSelect.value = settings.physicalLocation; 
            console.log("Library fields have been automatically set using last choice."); 
        } else { 
            alert("Could not find necessary field(s) with ID(s): " + missingIds.join(', ') + "! Aborting task."); 
        } 
    } 
    
    const requiredElementCheck = document.getElementById('bibliographicAuthor'); 
    if (!requiredElementCheck) { 
        alert("Could not find the 'bibliographicAuthor' element. Are you on the correct page? Aborting task."); 
        return; 
    } 
    
    let storedData; 
    try { 
        storedData = localStorage.getItem('lastCatalogSettings'); 
    } catch (e) { 
        console.error('Error reading settings from localStorage:', e); 
        alert('Could not read the last saved settings.'); 
        return; 
    } 
    
    if (storedData) { 
        try { 
            const parsedData = JSON.parse(storedData); 
            if (parsedData && parsedData.settings) { 
                setFields(parsedData.settings, parsedData.isPictureBook || false); 
            } else { 
                alert('Last saved settings are invalid. Please use the main menu bookmarklet first.'); 
            } 
        } catch (e) { 
            console.error('Error parsing stored settings:', e); 
            alert('Error reading last saved settings data. Please use the main menu bookmarklet first.'); 
        } 
    } else { 
        alert('No settings saved yet. Please use the main menu bookmarklet first to select a category.'); 
    } 
})();