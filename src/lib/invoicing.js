
// src/lib/invoicing.js
// Placeholder invoicing adapter for AFIP/ARCA integration.
// Later, replace the internals to call your backend API.
export async function issueDocument({ type = 'sale', payload, settings }) {
  // Simulate latency
  await new Promise(r => setTimeout(r, 200));
  // Return a temp number and a data URL PDF placeholder
  const numPrefix = type === 'sale' ? 'F' : type === 'remit' ? 'R' : type === 'quote' ? 'P' : type === 'credit' ? 'NC' : 'DOC';
  const number = `${numPrefix}-${Date.now()}`;
  // simple placeholder PDF as a blob URL (here just a text file for now)
  const blob = new Blob([`Documento ${number}\n\n${JSON.stringify(payload, null, 2)}`], { type: 'text/plain' });
  const pdf_url = URL.createObjectURL(blob);
  return { number, pdf_url, id: null };
}
