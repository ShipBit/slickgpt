import { getDocument, OPS } from 'pdfjs-dist';
import { MAX_ATTACHMENTS_SIZE, readFileAsArrayBuffer } from './fileUtils'
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

async function loadPdf(arrayBuffer: ArrayBuffer) {
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    return pdf;
}

async function extractTextContent(page: PDFPageProxy) {
    const textContent = await page.getTextContent();
    return textContent.items.map(item => {
        if ('str' in item) {
            return {
                type: 'text',
                content: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height
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
            const image = operatorList.argsArray[i][0];
            const imageDictionary = await page.objs.get(image);
            images.push({
                type: 'image',
                width: imageDictionary.width,
                height: imageDictionary.height,
                x: operatorList.argsArray[i][1],
                y: operatorList.argsArray[i][2]
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

        return result;
    } catch (error) {
        console.error('Error processing PDF:', error);
        return [{ type: 'error', message: (error as Error).message }];
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

async function handlePdfExtractionRequest(file: File) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    return await extractPdfContent(arrayBuffer);
}
