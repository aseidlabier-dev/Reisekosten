// Initialize Dexie database
const db = new Dexie('ReisekostenDB');

// Define database schema (Version 1)
db.version(1).stores({
    trips: '++id, name, createdAt',
    categories: '++id, name, createdAt',
    expenses: '++id, tripId, categoryId, amount, note, date, createdAt'
});

// Version 2: Update default categories (flat)
db.version(2).upgrade(async tx => {
    await tx.categories.clear();
});

// Version 3: Hierarchical categories
db.version(3).stores({
    categories: '++id, group, name, sortOrder, createdAt'
}).upgrade(async tx => {
    await tx.categories.clear();
    const newCategories = [
        { group: 'Reise', name: 'Benzin', sortOrder: 1 },
        { group: 'Reise', name: 'Maut', sortOrder: 2 },
        { group: 'Reise', name: 'ÖPNV', sortOrder: 3 },
        { group: 'Reise', name: 'Sonstiges', sortOrder: 4 },
        { group: 'Unterkunft', name: 'Unterkunft', sortOrder: 5 },
        { group: 'Restaurants', name: 'Frühstück', sortOrder: 6 },
        { group: 'Restaurants', name: 'Mittagessen', sortOrder: 7 },
        { group: 'Restaurants', name: 'Abendessen', sortOrder: 8 },
        { group: 'Restaurants', name: 'Bar', sortOrder: 9 },
        { group: 'Restaurants', name: 'Sonstiges', sortOrder: 10 },
        { group: 'Einkäufe', name: 'Essen & Trinken', sortOrder: 11 },
        { group: 'Einkäufe', name: 'Haushaltswaren', sortOrder: 12 },
        { group: 'Einkäufe', name: 'Sonstiges', sortOrder: 13 },
        { group: 'Freizeit', name: 'Eintritte', sortOrder: 14 },
        { group: 'Freizeit', name: 'Ausflüge', sortOrder: 15 },
        { group: 'Freizeit', name: 'Sonstiges', sortOrder: 16 },
        { group: 'Sonstiges', name: 'Sonstiges', sortOrder: 17 }
    ];
    
    await tx.categories.bulkAdd(newCategories.map(c => ({
        ...c,
        createdAt: new Date()
    })));
});

// Database API
const api = {
    // Trips
    async addTrip(name) {
        return await db.trips.add({
            name,
            createdAt: new Date()
        });
    },
    async getTrips() {
        return await db.trips.orderBy('createdAt').reverse().toArray();
    },
    async editTrip(id, newName) {
        return await db.trips.update(id, { name: newName });
    },
    async deleteTrip(id) {
        // Delete all expenses for this trip (using == to catch both integer and legacy string IDs)
        const allExpenses = await db.expenses.toArray();
        const toDelete = allExpenses.filter(e => e.tripId == id).map(e => e.id);
        if (toDelete.length > 0) {
            await db.expenses.bulkDelete(toDelete);
        }
        return await db.trips.delete(id);
    },

    // Categories
    async addCategory(group, name) {
        // Find max sortOrder to append at the end
        const allCats = await this.getCategories();
        let maxSort = 0;
        allCats.forEach(c => { if(c.sortOrder > maxSort) maxSort = c.sortOrder; });

        return await db.categories.add({
            group,
            name,
            sortOrder: maxSort + 1,
            createdAt: new Date()
        });
    },
    async getCategories() {
        return await db.categories.orderBy('sortOrder').toArray();
    },
    async editCategory(id, newGroup, newName) {
        return await db.categories.update(id, { group: newGroup, name: newName });
    },
    async deleteCategory(id) {
        // Optionally handle expenses linked to this category
        return await db.categories.delete(id);
    },

    // Expenses
    async addExpense(tripId, categoryId, amount, note, date, photo) {
        return await db.expenses.add({
            tripId: parseInt(tripId),
            categoryId: parseInt(categoryId),
            amount: parseFloat(amount),
            note: note || '',
            date: date || new Date().toISOString(),
            photo: photo || null,
            createdAt: new Date()
        });
    },
    async getExpenses() {
        return await db.expenses.orderBy('createdAt').reverse().toArray();
    },
    async getExpensesWithDetails() {
        const expenses = await db.expenses.orderBy('date').reverse().toArray();
        const trips = await this.getTrips();
        const cats = await this.getCategories();
        
        const tripMap = {};
        trips.forEach(t => tripMap[t.id] = t.name);
        
        const catMap = {};
        const catGroupMap = {};
        cats.forEach(c => {
            catMap[c.id] = c.name;
            catGroupMap[c.id] = c.group;
        });

        return expenses.map(e => ({
            ...e,
            tripName: tripMap[e.tripId] || 'Unbekannte Reise',
            categoryName: catMap[e.categoryId] || 'Unbekannte Kategorie',
            mainCat: catGroupMap[e.categoryId] || 'Unbekannt',
            subCat: catMap[e.categoryId] || 'Unbekannt'
        }));
    },
    async editExpense(id, amount, note) {
        return await db.expenses.update(id, { 
            amount: parseFloat(amount), 
            note: note || '' 
        });
    },
    async deleteExpense(id) {
        return await db.expenses.delete(id);
    },
    async restoreDefaultCategories() {
        const defaultCategories = [
            { group: 'Reise', name: 'Benzin' },
            { group: 'Reise', name: 'Maut' },
            { group: 'Reise', name: 'ÖPNV' },
            { group: 'Reise', name: 'Sonstiges' },
            { group: 'Unterkunft', name: 'Unterkunft' },
            { group: 'Restaurants', name: 'Frühstück' },
            { group: 'Restaurants', name: 'Mittagessen' },
            { group: 'Restaurants', name: 'Abendessen' },
            { group: 'Restaurants', name: 'Bar' },
            { group: 'Restaurants', name: 'Sonstiges' },
            { group: 'Einkäufe', name: 'Essen & Trinken' },
            { group: 'Einkäufe', name: 'Haushaltswaren' },
            { group: 'Einkäufe', name: 'Sonstiges' },
            { group: 'Freizeit', name: 'Eintritte' },
            { group: 'Freizeit', name: 'Ausflüge' },
            { group: 'Freizeit', name: 'Sonstiges' },
            { group: 'Sonstiges', name: 'Sonstiges' }
        ];
        
        const existing = await this.getCategories();
        let restoredCount = 0;
        
        for (const defCat of defaultCategories) {
            const exists = existing.find(c => c.group === defCat.group && c.name === defCat.name);
            if (!exists) {
                await this.addCategory(defCat.group, defCat.name);
                restoredCount++;
            }
        }
        return restoredCount;
    }
};

// Populate for completely fresh installs
db.on('populate', async () => {
    const defaultCategories = [
        { group: 'Reise', name: 'Benzin', sortOrder: 1 },
        { group: 'Reise', name: 'Maut', sortOrder: 2 },
        { group: 'Reise', name: 'ÖPNV', sortOrder: 3 },
        { group: 'Reise', name: 'Sonstiges', sortOrder: 4 },
        { group: 'Unterkunft', name: 'Unterkunft', sortOrder: 5 },
        { group: 'Restaurants', name: 'Frühstück', sortOrder: 6 },
        { group: 'Restaurants', name: 'Mittagessen', sortOrder: 7 },
        { group: 'Restaurants', name: 'Abendessen', sortOrder: 8 },
        { group: 'Restaurants', name: 'Bar', sortOrder: 9 },
        { group: 'Restaurants', name: 'Sonstiges', sortOrder: 10 },
        { group: 'Einkäufe', name: 'Essen & Trinken', sortOrder: 11 },
        { group: 'Einkäufe', name: 'Haushaltswaren', sortOrder: 12 },
        { group: 'Einkäufe', name: 'Sonstiges', sortOrder: 13 },
        { group: 'Freizeit', name: 'Eintritte', sortOrder: 14 },
        { group: 'Freizeit', name: 'Ausflüge', sortOrder: 15 },
        { group: 'Freizeit', name: 'Sonstiges', sortOrder: 16 },
        { group: 'Sonstiges', name: 'Sonstiges', sortOrder: 17 }
    ];
    await db.categories.bulkAdd(defaultCategories.map(c => ({...c, createdAt: new Date()})));
});
