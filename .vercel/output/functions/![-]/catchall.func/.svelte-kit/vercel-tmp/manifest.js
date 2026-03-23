export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["Akshat.pdf","assests/Cosmic.png","assests/Elibrary.png","assests/Pms.jpeg","assests/Taleox.png","assests/anti.png","assests/backend.webp","assests/devops.webp","assests/frontend.webp","assests/hall.png","assests/itax.png","assests/observability.webp","assests/particles.json","assests/prep.png","assests/rann.png","assests/sandesh.png","assests/upinthesky.png","favicon.png"]),
	mimeTypes: {".pdf":"application/pdf",".png":"image/png",".jpeg":"image/jpeg",".webp":"image/webp",".json":"application/json"},
	_: {
		client: {start:"_app/immutable/entry/start.CaPKUjcP.js",app:"_app/immutable/entry/app.eTKL0tJ1.js",imports:["_app/immutable/entry/start.CaPKUjcP.js","_app/immutable/chunks/D1JCcj43.js","_app/immutable/chunks/CDUplSyU.js","_app/immutable/chunks/B4I31lOv.js","_app/immutable/entry/app.eTKL0tJ1.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/CDUplSyU.js","_app/immutable/chunks/CH44Bw5K.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
