/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event, status, message }) {
	// 404s are expected noise; log real failures so they show up in Vercel logs
	if (status === 404) return;
	console.error(`[DATD] ${status} ${event.request.method} ${event.url.pathname}: ${message}`, error);
}
