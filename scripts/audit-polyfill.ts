const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k,v)=>store.set(k,String(v)), removeItem: k=>store.delete(k), clear: ()=>store.clear(), key: i=>[...store.keys()][i] ?? null, get length(){return store.size;} };
globalThis.window = globalThis.window ?? globalThis;
