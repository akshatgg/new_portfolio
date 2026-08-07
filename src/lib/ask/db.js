// Chat history lives in the browser, never on the server. The API is stateless:
// the whole transcript is replayed with every request, so this store is the only
// place a conversation exists.

const DB_NAME = 'akshat-ask';
const STORE = 'turns';

function open() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) {
				req.result.createObjectStore(STORE, { keyPath: 'i', autoIncrement: true });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

// Every operation is best-effort. IndexedDB is unavailable in private windows in
// some browsers, and a portfolio chat that throws because history can't persist
// would be worse than one that simply forgets.

export async function loadTurns() {
	try {
		const db = await open();
		return await new Promise((resolve, reject) => {
			const r = db.transaction(STORE).objectStore(STORE).getAll();
			r.onsuccess = () => resolve(r.result);
			r.onerror = () => reject(r.error);
		});
	} catch {
		return [];
	}
}

export async function persistTurn(turn) {
	try {
		const db = await open();
		db.transaction(STORE, 'readwrite').objectStore(STORE).add(turn);
	} catch {
		/* history is a convenience, not a requirement */
	}
}

export async function clearTurns() {
	try {
		const db = await open();
		db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
	} catch {
		/* as above */
	}
}
