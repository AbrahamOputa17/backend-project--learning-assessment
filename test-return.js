const pdf = require('pdf-parse');
const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length 12 >>\nstream\nBT /F1 12 Tf 10 10 Td (Hello) Tj ET\nendstream\nendobj\ntrailer\n<< /Size 3 >>\n%%EOF');

async function test() {
  try {
    const uint8 = new Uint8Array(buffer);
    const instance = new pdf.PDFParse(uint8);
    const result = await instance.getText();
    console.log('Result type:', typeof result);
    console.log('Result keys:', result ? Object.keys(result) : 'null');
    console.log('Result value:', JSON.stringify(result));
  } catch (err) {
    console.log('Error:', err);
  }
}
test();
