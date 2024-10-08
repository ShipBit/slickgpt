import { getDocument, OPS, GlobalWorkerOptions } from 'pdfjs-dist';
import { MAX_ATTACHMENTS_SIZE, readFileAsArrayBuffer } from './fileUtils'
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs';

async function loadPdf(arrayBuffer: ArrayBuffer) {
    return await getDocument({ data: arrayBuffer }).promise;
}

async function extractTextContent(page: PDFPageProxy) {
    const textContent = await page.getTextContent();
    return textContent.items.map(item => {
        if ('str' in item) {
            return {
                type: 'text',
                content: item.str,
                position: { x: item.transform[4], y: item.transform[5] },
            };
        }
        return null;
    }).filter(Boolean);
}

async function extractImageData(page: PDFPageProxy) {
    const operatorList = await page.getOperatorList();
    const images = [];

    for (let i = 0; i < operatorList.fnArray.length && images.length < MAX_ATTACHMENTS_SIZE; i++) {
        if (operatorList.fnArray[i] === OPS.paintImageXObject) {
            const imageDictionary = operatorList.argsArray[i][0];
            const image = await page.objs.get(imageDictionary);
            const base64Image = null; // convert imageDictionary to base64
            images.push({
                type: 'image',
                base64: base64Image,
                position: { x: operatorList.argsArray[i][1], y: operatorList.argsArray[i][2] },
                width: image.width,
                height: image.height
            });
        }
    }

    return images;
}


async function extractPdfContent(arrayBuffer: ArrayBuffer) {
    try {
        const pdfDocument = await loadPdf(arrayBuffer);
        const numPages = pdfDocument.numPages;
        let result: any = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await extractTextContent(page);
            const imageData = await extractImageData(page);
            result = result.concat(textContent, imageData);
        }

        // Convert result to string format
        return JSON.stringify(result); // Return as a string
    } catch (error) {
        console.error('Error processing PDF:', error);
        return JSON.stringify([{ type: 'error', message: (error as Error).message }]);
    }
}


// For later
// async function handleFileExtractionRequest(file: File) {
//     const arrayBuffer = await readFileAsArrayBuffer(file);

//     if (file.type === 'application/pdf') {
//         return await extractPdfContent(arrayBuffer);
//     } else {
//         return [{ type: 'error', message: 'Unsupported file type' }];
//     }
// }

export async function handlePdfExtractionRequest(file: File) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const content = await extractPdfContent(arrayBuffer);
    console.log(content);
    return null;
}
