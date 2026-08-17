document.addEventListener('DOMContentLoaded', async () => {
    // Theme Toggle Logic
    const themeCheckbox = document.getElementById('theme-checkbox');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeCheckbox.checked = true;
    }
    
    themeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    // Initialize Lucide icons
    lucide.createIcons();

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const headerTitle = document.getElementById('header-title');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Forms
    const expenseForm = document.getElementById('expense-form');
    const tripForm = document.getElementById('trip-form');
    const categoryForm = document.getElementById('category-form');

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update Active Nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Update View
            const targetViewId = item.getAttribute('data-view');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetViewId).classList.add('active');

            // Refresh Data based on view
            if(targetViewId === 'view-home') loadHomeData();
            if(targetViewId === 'view-edit') loadEditData();
            if(targetViewId === 'view-stats') loadStatsData();
        });
    });

    // Tab Logic (Edit View)
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetTabId = btn.getAttribute('data-target');
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(targetTabId).classList.add('active');
        });
    });

    // Helper for category icons
    function getIconForCategory(catName) {
        if (!catName) return 'tag';
        const name = catName.toLowerCase();
        if (name.includes('reise')) return 'car';
        if (name.includes('unterkunft')) return 'bed';
        if (name.includes('restaurant')) return 'utensils';
        if (name.includes('einkäufe')) return 'shopping-bag';
        if (name.includes('freizeit')) return 'camera';
        if (name.includes('benzin')) return 'fuel';
        if (name.includes('maut')) return 'ticket';
        if (name.includes('öpnv')) return 'bus';
        if (name.includes('frühstück')) return 'coffee';
        if (name.includes('mittagessen') || name.includes('abendessen')) return 'utensils-crossed';
        if (name.includes('bar')) return 'beer';
        if (name.includes('haushaltswaren')) return 'home';
        if (name.includes('eintritt')) return 'ticket';
        if (name.includes('ausflug')) return 'map';
        return 'tag';
    }

    // Data Loading Functions
    async function loadHomeData() {
        const trips = await api.getTrips();
        const categories = await api.getCategories();
        
        // Populate Selects
        const tripSelect = document.getElementById('trip-select');
        tripSelect.innerHTML = '<option value="" disabled selected>Reise wählen...</option>';
        trips.forEach(t => {
            tripSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });

        const catSelect = document.getElementById('category-select');
        catSelect.innerHTML = '<option value="" disabled selected>Kategorie wählen...</option>';
        
        // Group categories
        const groupedCats = {};
        categories.forEach(c => {
            if(!groupedCats[c.group]) groupedCats[c.group] = [];
            groupedCats[c.group].push(c);
        });
        
        for (const [group, cats] of Object.entries(groupedCats)) {
            let optgroup = `<optgroup label="${group}">`;
            cats.forEach(c => {
                optgroup += `<option value="${c.id}">${c.name}</option>`;
            });
            optgroup += `</optgroup>`;
            catSelect.innerHTML += optgroup;
        }

        // Populate Recent Expenses
        const expenses = await api.getExpensesWithDetails();
        const list = document.getElementById('recent-expenses-list');
        list.innerHTML = '';
        
        if (expenses.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Noch keine Eingaben vorhanden.</p>';
        } else {
            expenses.slice(0, 5).forEach(e => {
                const date = new Date(e.date).toLocaleDateString('de-DE');
                const photoIcon = e.photo ? `<button class="btn-primary view-photo" data-photo="${e.photo}" style="padding:4px; margin-left:8px; background:transparent; border:1px solid var(--border-color); box-shadow:none;"><i data-lucide="camera" style="width:16px;height:16px;color:var(--text-secondary);"></i></button>` : '';
                const mainIcon = getIconForCategory(e.mainCat);
                const subIcon = getIconForCategory(e.subCat);
                list.innerHTML += `
                    <div class="list-item">
                        <div class="list-item-content">
                            <span class="list-item-title">${e.tripName}</span>
                            <span class="list-item-subtitle" style="display:flex; align-items:center; gap:4px;">
                                <i data-lucide="${mainIcon}" style="width:14px;height:14px;"></i> ${e.mainCat} &gt; 
                                <i data-lucide="${subIcon}" style="width:14px;height:14px;"></i> ${e.subCat} • ${date} ${e.note ? '• ' + e.note : ''} ${photoIcon}
                            </span>
                        </div>
                        <span class="list-item-amount">${e.amount.toFixed(2).replace('.', ',')} €</span>
                    </div>
                `;
            });
        }
        lucide.createIcons();
        attachPhotoHandlers();
    }

    async function loadEditData() {
        // Load Trips
        const trips = await api.getTrips();
        const tripsList = document.getElementById('trips-list');
        tripsList.innerHTML = trips.length ? '' : '<p class="empty-state" style="padding:10px">Keine Reisen angelegt.</p>';
        trips.forEach(t => {
            tripsList.innerHTML += `
                <div class="list-item">
                    <span class="list-item-title">${t.name}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary edit-trip" style="padding: 8px; width: auto;" data-id="${t.id}" data-name="${t.name}"><i data-lucide="edit-2" style="width: 18px; height: 18px;"></i></button>
                        <button class="btn-danger delete-trip" data-id="${t.id}"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
                    </div>
                </div>
            `;
        });

        // Load Categories
        const categories = await api.getCategories();
        const catsList = document.getElementById('categories-list');
        catsList.innerHTML = categories.length ? '' : '<p class="empty-state" style="padding:10px">Keine Kategorien vorhanden.</p>';
        categories.forEach(c => {
            const mainIcon = getIconForCategory(c.group);
            const subIcon = getIconForCategory(c.name);
            catsList.innerHTML += `
                <div class="list-item">
                    <span class="list-item-title" style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="${mainIcon}" style="width:16px;height:16px;color:var(--primary-color);"></i> ${c.group} &gt; 
                        <i data-lucide="${subIcon}" style="width:16px;height:16px;color:var(--primary-color);"></i> ${c.name}
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary edit-category" style="padding: 8px; width: auto;" data-id="${c.id}" data-group="${c.group}" data-name="${c.name}"><i data-lucide="edit-2" style="width: 18px; height: 18px;"></i></button>
                        <button class="btn-danger delete-category" data-id="${c.id}"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
                    </div>
                </div>
            `;
        });

        // Load All Entries
        const expenses = await api.getExpensesWithDetails();
        const entriesList = document.getElementById('all-entries-list');
        entriesList.innerHTML = expenses.length ? '' : '<p class="empty-state" style="padding:10px">Keine Kosteneinträge vorhanden.</p>';
        expenses.forEach(e => {
            const date = new Date(e.date).toLocaleDateString('de-DE');
            const photoIcon = e.photo ? `<button class="btn-primary view-photo" data-photo="${e.photo}" style="padding:4px; margin-left:8px; background:transparent; border:1px solid var(--border-color); box-shadow:none;"><i data-lucide="camera" style="width:16px;height:16px;color:var(--text-secondary);"></i></button>` : '';
            const mainIcon = getIconForCategory(e.mainCat);
            const subIcon = getIconForCategory(e.subCat);
            entriesList.innerHTML += `
                <div class="list-item">
                    <div class="list-item-content">
                        <span class="list-item-title">${e.tripName} <span style="font-weight:normal;color:var(--text-secondary)">- ${e.amount.toFixed(2).replace('.', ',')} €</span></span>
                        <span class="list-item-subtitle" style="display:flex; align-items:center; gap:4px;">
                            <i data-lucide="${mainIcon}" style="width:14px;height:14px;"></i> ${e.mainCat} &gt; 
                            <i data-lucide="${subIcon}" style="width:14px;height:14px;"></i> ${e.subCat} • ${date} ${photoIcon}
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary edit-entry" style="padding: 8px; width: auto;" data-id="${e.id}" data-amount="${e.amount}" data-note="${e.note}"><i data-lucide="edit-2" style="width: 18px; height: 18px;"></i></button>
                        <button class="btn-danger delete-entry" data-id="${e.id}"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
                    </div>
                </div>
            `;
        });

        lucide.createIcons();
        attachDeleteHandlers();
        attachEditHandlers();
        attachPhotoHandlers();
    }

    function attachDeleteHandlers() {
        // Restore Default Categories
        const btnRestoreCats = document.getElementById('btn-restore-cats');
        if (btnRestoreCats && !btnRestoreCats.dataset.bound) {
            btnRestoreCats.dataset.bound = "true";
            btnRestoreCats.addEventListener('click', async (e) => {
                e.preventDefault(); // Prevent form submission if inside a form, though it's outside
                const count = await api.restoreDefaultCategories();
                if (count > 0) {
                    alert(`${count} fehlende Standard-Kategorie(n) wurden erfolgreich wiederhergestellt!`);
                    loadEditData();
                    loadHomeData();
                } else {
                    alert('Alle Standard-Kategorien sind bereits vorhanden!');
                }
            });
        }

        document.querySelectorAll('.delete-trip').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Reise wirklich löschen? Alle zugehörigen Kosten werden ebenfalls gelöscht!')) {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    await api.deleteTrip(id);
                    loadEditData();
                    loadHomeData(); // Update home selects if needed
                }
            });
        });

        document.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Kategorie wirklich löschen?')) {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    await api.deleteCategory(id);
                    loadEditData();
                    loadHomeData();
                }
            });
        });

        document.querySelectorAll('.delete-entry').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Eintrag wirklich löschen?')) {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    await api.deleteExpense(id);
                    loadEditData();
                    loadHomeData();
                }
            });
        });
    }

    function attachEditHandlers() {
        document.querySelectorAll('.edit-trip').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const oldName = e.currentTarget.getAttribute('data-name');
                const newName = prompt('Neuer Name der Reise:', oldName);
                if (newName !== null && newName.trim() !== '') {
                    await api.editTrip(id, newName.trim());
                    loadEditData();
                    loadHomeData();
                }
            });
        });

        document.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const oldGroup = e.currentTarget.getAttribute('data-group');
                const oldName = e.currentTarget.getAttribute('data-name');
                
                const newGroup = prompt('Neue Überkategorie:', oldGroup);
                if (newGroup === null) return;
                
                const newName = prompt('Neue Unterkategorie:', oldName);
                if (newName === null) return;

                if (newGroup.trim() !== '' && newName.trim() !== '') {
                    await api.editCategory(id, newGroup.trim(), newName.trim());
                    loadEditData();
                    loadHomeData();
                }
            });
        });

        document.querySelectorAll('.edit-entry').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const oldAmount = e.currentTarget.getAttribute('data-amount');
                const oldNote = e.currentTarget.getAttribute('data-note');
                
                const newAmount = prompt('Neuer Betrag (€):', oldAmount);
                if (newAmount === null) return;
                
                const newNote = prompt('Neue Notiz:', oldNote);
                if (newNote === null) return;

                if (newAmount.trim() !== '') {
                    await api.editExpense(id, newAmount.trim(), newNote.trim());
                    loadEditData();
                    loadHomeData();
                }
            });
        });
    }

    // Form Submissions
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tripId = document.getElementById('trip-select').value;
        const categoryId = document.getElementById('category-select').value;
        const amount = document.getElementById('expense-amount').value;
        const note = document.getElementById('expense-note').value;
        const date = document.getElementById('expense-date').value;
        const photoInput = document.getElementById('expense-photo');

        if(!tripId || !categoryId) {
            alert('Bitte Reise und Kategorie wählen.');
            return;
        }

        let photoBase64 = null;
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            photoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        await api.addExpense(tripId, categoryId, amount, note, date, photoBase64);
        expenseForm.reset();
        document.getElementById('expense-date').valueAsDate = new Date();
        loadHomeData();
        
        // Visual feedback
        const btn = expenseForm.querySelector('button');
        const origText = btn.textContent;
        btn.textContent = 'Gespeichert!';
        btn.style.backgroundColor = '#10b981';
        setTimeout(() => {
            btn.textContent = origText;
            btn.style.backgroundColor = 'var(--primary-color)';
        }, 2000);
    });

    tripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('trip-name');
        await api.addTrip(input.value.trim());
        input.value = '';
        loadEditData();
    });

    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupInput = document.getElementById('category-group');
        const nameInput = document.getElementById('category-name');
        await api.addCategory(groupInput.value.trim(), nameInput.value.trim());
        groupInput.value = '';
        nameInput.value = '';
        loadEditData();
    });

    function attachPhotoHandlers() {
        document.querySelectorAll('.view-photo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const base64 = e.currentTarget.getAttribute('data-photo');
                if (base64) {
                    document.getElementById('modal-image').src = base64;
                    document.getElementById('photo-modal').style.display = 'flex';
                }
            });
        });
    }

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('photo-modal').style.display = 'none';
        document.getElementById('modal-image').src = '';
    });

    // --- STATISTICS & PDF EXPORT LOGIC ---

    const statsTripSelect = document.getElementById('stats-trip-select');
    const statsModeSelect = document.getElementById('stats-mode-select');
    const statsSortSelect = document.getElementById('stats-sort-select');
    const statsReportContent = document.getElementById('stats-report-content');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    let statsChartInstance = null;

    async function loadStatsData() {
        const trips = await api.getTrips();
        const currentVal = statsTripSelect.value;
        
        statsTripSelect.innerHTML = '<option value="" disabled selected>Reise wählen...</option>';
        trips.forEach(t => {
            statsTripSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        
        if (currentVal) statsTripSelect.value = currentVal;
        
        updateSortOptions();
        renderStats();
    }

    statsTripSelect.addEventListener('change', renderStats);
    statsModeSelect.addEventListener('change', () => {
        updateSortOptions();
        renderStats();
    });
    statsSortSelect.addEventListener('change', renderStats);

    function updateSortOptions() {
        const mode = statsModeSelect.value;
        statsSortSelect.innerHTML = '';
        if (mode === 'complete') {
            statsSortSelect.innerHTML += `<option value="date-desc">Datum (neueste zuerst)</option>`;
            statsSortSelect.innerHTML += `<option value="date-asc">Datum (älteste zuerst)</option>`;
            statsSortSelect.innerHTML += `<option value="cost-desc">Kosten (höchste zuerst)</option>`;
            statsSortSelect.innerHTML += `<option value="cost-asc">Kosten (niedrigste zuerst)</option>`;
            statsSortSelect.innerHTML += `<option value="cat-asc">Kategorie (A-Z)</option>`;
        } else {
            // grouped views
            statsSortSelect.innerHTML += `<option value="cost-desc">Kosten (höchste zuerst)</option>`;
            statsSortSelect.innerHTML += `<option value="cost-asc">Kosten (niedrigste zuerst)</option>`;
            statsSortSelect.innerHTML += `<option value="name-asc">Name (A-Z)</option>`;
        }
    }

    async function renderStats() {
        const tripId = statsTripSelect.value;
        if (!tripId) {
            statsReportContent.innerHTML = `
                <div class="empty-state" style="color: #64748b;">
                    <i data-lucide="bar-chart-2" class="empty-icon"></i>
                    <h2>Keine Reise gewählt</h2>
                    <p>Bitte wählen Sie oben eine Reise aus.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        if (statsChartInstance) {
            statsChartInstance.destroy();
            statsChartInstance = null;
        }

        const mode = statsModeSelect.value;
        const sort = statsSortSelect.value;

        // Fetch all expenses and trips/cats
        let expenses = await api.getExpensesWithDetails();
        // Filter by trip
        expenses = expenses.filter(e => e.tripId == tripId);

        if (expenses.length === 0) {
            statsReportContent.innerHTML = `<h3 style="text-align:center; padding:20px; color:#64748b;">Keine Ausgaben für diese Reise gefunden.</h3>`;
            return;
        }

        let html = `<div style="font-family: Arial, sans-serif; background-color: #ffffff; padding: 10px;">`;
        
        // Get Trip Name for title
        const tripSelect = document.getElementById('stats-trip-select');
        const tripName = tripSelect.options[tripSelect.selectedIndex].text;
        
        html += `<h1 style="display: block; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; color: #0f172a; font-size: 24px;">Reisekosten-Bericht: ${tripName}</h1>`;
        
        const totalCost = expenses.reduce((sum, e) => sum + e.amount, 0);
        html += `<h2 style="display: block; color: #0f172a; margin-bottom: 20px; font-size: 20px;">Gesamtkosten: ${totalCost.toFixed(2).replace('.', ',')} €</h2>`;

        html += `
            <div style="max-width: 320px; margin: 0 auto 30px auto;">
                <canvas id="statsChart"></canvas>
            </div>
        `;

        // Chart Data Variables
        let chartLabels = [];
        let chartData = [];

        // Helper to render an item row
        const renderRow = (e) => {
            const d = new Date(e.date).toLocaleDateString('de-DE');
            const noteHtml = e.note ? `<br><small style="color: #64748b;">Notiz: ${e.note}</small>` : '';
            const imgHtml = e.photo ? `<div style="margin-top: 8px;"><img src="${e.photo}" style="max-height: 100px; border-radius: 4px; border: 1px solid #e2e8f0;"></div>` : '';
            
            const mainIconHtml = `<i data-lucide="${getIconForCategory(e.mainCat)}" style="width:14px;height:14px;vertical-align:middle;margin-right:2px;color:var(--text-secondary)"></i>`;
            const subIconHtml = `<i data-lucide="${getIconForCategory(e.subCat)}" style="width:14px;height:14px;vertical-align:middle;margin-right:2px;color:var(--text-secondary)"></i>`;
            
            return `
                <div style="padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                    <div>
                        <strong style="display:inline-flex; align-items:center;">
                            Kategorie: ${mainIconHtml} ${e.mainCat} &gt; ${subIconHtml} ${e.subCat}
                        </strong> 
                        <span style="color:#94a3b8; font-size: 0.9em; margin-left: 4px;">(${d})</span>
                        ${noteHtml}
                        ${imgHtml}
                    </div>
                    <div style="font-weight: bold; font-size: 1.1em; white-space: nowrap;">${e.amount.toFixed(2).replace('.', ',')} €</div>
                </div>
            `;
        };

        if (mode === 'complete') {
            // Chart Data for complete mode: Group by mainCat just for the chart
            const chartGroups = {};
            expenses.forEach(e => {
                if(!chartGroups[e.mainCat]) chartGroups[e.mainCat] = 0;
                chartGroups[e.mainCat] += e.amount;
            });
            chartLabels = Object.keys(chartGroups);
            chartData = Object.values(chartGroups);

            // Sort expenses
            expenses.sort((a, b) => {
                if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
                if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
                if (sort === 'cost-desc') return b.amount - a.amount;
                if (sort === 'cost-asc') return a.amount - b.amount;
                if (sort === 'cat-asc') return a.categoryName.localeCompare(b.categoryName);
                return 0;
            });

            html += `<div style="border: 1px solid #e2e8f0; border-radius: 8px;">`;
            expenses.forEach(e => { html += renderRow(e); });
            html += `</div>`;
        } else {
            // Grouping Mode
            const grouped = {};
            expenses.forEach(e => {
                const groupKey = mode === 'group-main' ? e.mainCat : `${e.mainCat} > ${e.subCat}`;
                if (!grouped[groupKey]) grouped[groupKey] = { items: [], total: 0 };
                grouped[groupKey].items.push(e);
                grouped[groupKey].total += e.amount;
            });

            // Convert to array and sort groups
            let groupArr = Object.keys(grouped).map(k => ({
                key: k,
                total: grouped[k].total,
                items: grouped[k].items
            }));

            groupArr.sort((a, b) => {
                if (sort === 'cost-desc') return b.total - a.total;
                if (sort === 'cost-asc') return a.total - b.total;
                if (sort === 'name-asc') return a.key.localeCompare(b.key);
                return 0;
            });

            groupArr.forEach(g => {
                chartLabels.push(g.key);
                chartData.push(g.total);
                
                const groupLabel = mode === 'group-main' ? 'Überkategorie' : 'Unterkategorie';
                
                let iconName = 'tag';
                if (mode === 'group-main') {
                    iconName = getIconForCategory(g.key);
                } else if (mode === 'group-sub') {
                    const parts = g.key.split(' > ');
                    iconName = getIconForCategory(parts.length > 1 ? parts[1] : parts[0]);
                }
                const iconHtml = `<i data-lucide="${iconName}" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;color:var(--primary-color)"></i>`;

                html += `
                    <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="display: flex; align-items: center; margin: 0; font-size: 18px; color: #334155;">${iconHtml} ${groupLabel}: ${g.key}</h3>
                            <strong style="color: #0f172a; font-size: 18px; white-space: nowrap;">Summe: ${g.total.toFixed(2).replace('.', ',')} €</strong>
                        </div>
                        <div>
                `;
                g.items.forEach(e => { html += renderRow(e); });
                html += `</div></div>`;
            });
        }

        // Add copyright footer
        html += `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
                &copy; Christian Schuster | 2026 | with Antigravity
            </div>
        </div>`;
        statsReportContent.innerHTML = html;
        lucide.createIcons();

        // Render Pie Chart
        const ctx = document.getElementById('statsChart').getContext('2d');
        statsChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: [
                        '#ef4444', // Red
                        '#3b82f6', // Blue
                        '#10b981', // Green
                        '#f59e0b', // Amber
                        '#8b5cf6', // Purple
                        '#14b8a6', // Teal
                        '#f43f5e', // Rose
                        '#eab308', // Yellow
                        '#0ea5e9', // Sky Blue
                        '#84cc16', // Lime
                        '#6366f1', // Indigo
                        '#f97316'  // Orange
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: 'Outfit', size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) {
                                    label += context.parsed.toFixed(2).replace('.', ',') + ' €';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    btnExportPdf.addEventListener('click', () => {
        const element = document.getElementById('stats-report-content');
        if (element.innerText.includes('Keine Reise gewählt') || element.innerText.includes('Keine Ausgaben')) {
            alert('Bitte wählen Sie zuerst eine Reise mit Ausgaben aus.');
            return;
        }

        // Get Trip Name for filename
        const tripSelect = document.getElementById('stats-trip-select');
        let tripName = tripSelect.options[tripSelect.selectedIndex].text;
        tripName = tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const opt = {
            margin:       10,
            filename:     `reisekosten_${tripName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Call html2pdf
        html2pdf().set(opt).from(element).save();
    });

    // Initial Load
    document.getElementById('expense-date').valueAsDate = new Date();
    loadHomeData();
});
